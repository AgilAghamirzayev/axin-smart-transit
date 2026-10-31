package az.transit.journey;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import az.transit.network.*;
import az.transit.telemetry.*;
import az.transit.analytics.CrowdingPolicy;
import az.transit.crowding.*;
import az.transit.presence.*;
import az.transit.shared.TransitProperties;

@Service
public class JourneyService {
    public enum Preference { BALANCED, FASTEST, COMFORT, ECONOMY }
    public record Leg(String routeId,String routeNumber,String vehicleId,int pathIndex,Stop from,Stop to,
                      Instant boardAt,Instant alightAt,long waitSeconds,long rideSeconds,CrowdLevel crowdLevel,
                      double boardProgress,double alightProgress) {}
    public record Option(List<Leg> legs,long walkingSeconds,long totalSeconds,long crowdPenaltySeconds,
                         Instant arriveAt,long uncertaintySeconds,String explanation) {}
    public record Plan(Instant generatedAt,List<Option> options,String method,String limitation) {}
    private record Pattern(TransitRoute route,int pathIndex,Map<String,List<Double>> stops,double cycle,boolean closed) {}
    private record Nearby(Stop stop,long walk) {}
    private record Transfer(Pattern pattern,String stopId,long walking) {}
    private final Map<String,List<Nearby>> transferNeighbors=new HashMap<>();
    private record First(Leg leg,long walking,double arrival,long penalty) {}
    private final List<Pattern> patterns;
    private final Map<String,Stop> stops;
    private final VehicleRepository vehicles;
    private final ReportRepository reports;
    private final CrowdingPolicy crowding;
    private final PresenceService presence;
    private final OccupancyPolicy occupancy;
    private final RouteGeometry geometry;
    private final TransitProperties properties;
    private final Clock clock;
    public JourneyService(NetworkRepository network,VehicleRepository vehicles,ReportRepository reports,CrowdingPolicy crowding,
            PresenceService presence,OccupancyPolicy occupancy,RouteGeometry geometry,TransitProperties properties,Clock clock) {
        this.vehicles=vehicles;this.reports=reports;this.crowding=crowding;this.presence=presence;this.occupancy=occupancy;
        this.geometry=geometry;this.properties=properties;this.clock=clock;
        stops=network.catalog().stops().stream().collect(Collectors.toMap(Stop::id,s->s));
        var built=new ArrayList<Pattern>();
        for(var route:network.routes()) for(int path=0;path<route.paths().size();path++) {
            Map<String,List<Double>> matches=new LinkedHashMap<>();int index=path;
            if(route.source().equals("DEMO")) route.stops().forEach(s->matches.put(s.id(),List.of(geometry.project(route,index,s.latitude(),s.longitude()).progressMeters())));
            else route.stopMatches().stream().filter(m->m.pathIndex()==index).forEach(m->matches.computeIfAbsent(m.stopId(),k->new ArrayList<>()).add(m.progressMeters()));
            built.add(new Pattern(route,path,matches,geometry.cycleLength(route,path),route.paths().get(path).closed()));
        }
        patterns=List.copyOf(built);
        var used=patterns.stream().flatMap(p->p.stops().keySet().stream()).distinct().map(stops::get).filter(Objects::nonNull).toList();
        for(var stop:used) transferNeighbors.put(stop.id(),used.stream()
            .map(other->new Nearby(other,(long)Math.ceil(geometry.distance(stop.latitude(),stop.longitude(),other.latitude(),other.longitude()))))
            .filter(n->n.walk()<=250).toList());
    }
    public Plan plan(double fromLat,double fromLon,double toLat,double toLon,Preference preference) {
        return plan(fromLat,fromLon,toLat,toLon,preference,null,null);
    }
    public Plan plan(double fromLat,double fromLon,double toLat,double toLon,Preference preference,String fromStopId,String toStopId) {
        var now=clock.instant();
        if(fromStopId!=null && !fromStopId.isBlank() && !stops.containsKey(fromStopId))
            throw az.transit.shared.ApiException.notFound("Başlanğıc dayanacağı tapılmadı");
        // Search every served stop within walking range, not only the nearest stop.
        var origins=stops.values().stream().filter(stop->transferNeighbors.containsKey(stop.id()))
            .map(stop->new Nearby(stop,(long)Math.ceil(geometry.distance(fromLat,fromLon,stop.latitude(),stop.longitude()))))
            .filter(stop->stop.walk()<=800).sorted(Comparator.comparingLong(Nearby::walk)).toList();
        if(toStopId!=null && !toStopId.isBlank() && !stops.containsKey(toStopId))
            throw az.transit.shared.ApiException.notFound("Təyinat dayanacağı tapılmadı");
        double directDistance=geometry.distance(fromLat,fromLon,toLat,toLon);
        if(directDistance<1000) {
            long seconds=(long)Math.ceil(directDistance); // 1.25 detour / 1.25 m/s
            var walk=new Option(List.of(),seconds,seconds,0,now.plusSeconds(seconds),Math.max(60,(long)(seconds*.2)),
                "Təxmini piyada məsafəsi: "+Math.round(directDistance*1.25)+" m. Avtobusa minmək lazım deyil.");
            return new Plan(now,List.of(walk),"WALK_ONLY","Birbaşa məsafə 1 km-dən azdır. Piyada yoluna 25% dolanma payı əlavə olunur; küçə üzrə yol təsdiqlənməyib.");
        }
        // A short final walk can beat an unnecessary extra bus to the exact stop.
        var destinations=nearby(toLat,toLon,1000);
        var destinationById=destinations.stream().collect(Collectors.toMap(n->n.stop().id(),n->n));
        var fleet=vehicles.all().stream().filter(v->!v.observedAt().isBefore(now.minus(properties.gpsFreshness())))
            .collect(Collectors.groupingBy(v->key(v.routeId(),v.pathIndex())));
        var recent=reports.since(now.minus(properties.reportFreshness()));var samples=presence.counts();
        Map<String,CrowdLevel> levels=new HashMap<>();
        fleet.values().stream().flatMap(List::stream).forEach(v->levels.put(v.id(),occupancy.combine(crowding.summarize(
            recent.stream().filter(r->r.vehicleId().equals(v.id())).toList(),1,properties.highRatio()).level(),samples.getOrDefault(v.id(),0))));
        // Nearby transfer links are straight-line walking estimates, explicitly labelled in the UI.
        var endings=patterns.stream().filter(p->p.stops().keySet().stream().anyMatch(destinationById::containsKey)
            && fleet.containsKey(key(p.route().id(),p.pathIndex()))).toList();
        Map<String,List<Transfer>> transfers=new HashMap<>();
        endings.forEach(p->p.stops().keySet().forEach(id->{
            for(var neighbor:transferNeighbors.getOrDefault(id,List.of()))
                transfers.computeIfAbsent(neighbor.stop().id(),k->new ArrayList<>()).add(new Transfer(p,id,neighbor.walk()));
        }));
        var results=new ArrayList<Option>();Map<String,List<First>> firsts=new HashMap<>();
        for(var pattern:patterns) for(var origin:origins) {
            if(!pattern.stops().containsKey(origin.stop().id())) continue;
            for(var vehicle:fleet.getOrDefault(key(pattern.route().id(),pattern.pathIndex()),List.of())) {
                for(String target:pattern.stops().keySet()) {
                    if(target.equals(origin.stop().id()) || (!transfers.containsKey(target) && !destinationById.containsKey(target))) continue;
                    var timing=timing(pattern,vehicle,origin.stop().id(),target,origin.walk(),now);
                    if(timing==null || timing.alightSeconds()>7200) continue;
                    var level=levels.get(vehicle.id());long penalty=penalty(level,preference);
                    var leg=leg(pattern,vehicle,origin.stop().id(),target,timing,origin.walk(),level,now);
                    var destination=destinationById.get(target);
                    if(destination!=null) results.add(option(List.of(leg),origin.walk()+destination.walk(),timing.alightSeconds()+destination.walk(),penalty,now));
                    if(transfers.containsKey(target)) {
                        var alternatives=firsts.computeIfAbsent(target,k->new ArrayList<>());
                        alternatives.add(new First(leg,origin.walk(),Math.ceil(timing.alightSeconds()),penalty));
                    }
                }
            }
        }
        // Preserve nondominated arrival/comfort labels (the second bus may be missed by a later label).
        for(var entry:firsts.entrySet()) {
            var labels=pareto(entry.getValue());
            for(var first:labels) for(var transfer:transfers.get(entry.getKey())) {
                if(geometry.distance(first.leg().to().latitude(),first.leg().to().longitude(),toLat,toLon)<1000) continue;
                var pattern=transfer.pattern();
                if(pattern.route().id().equals(first.leg().routeId())) continue;
                for(var destination:destinations) {
                    if(!pattern.stops().containsKey(destination.stop().id()) || destination.stop().id().equals(transfer.stopId())) continue;
                    for(var vehicle:fleet.getOrDefault(key(pattern.route().id(),pattern.pathIndex()),List.of())) {
                        double ready=first.arrival()+60+transfer.walking(); // transfer boarding allowance
                        var timing=timing(pattern,vehicle,transfer.stopId(),destination.stop().id(),ready,now);
                        if(timing==null || timing.alightSeconds()>7200) continue;
                        var level=levels.get(vehicle.id());
                        var second=leg(pattern,vehicle,transfer.stopId(),destination.stop().id(),timing,ready,level,now);
                        results.add(option(List.of(first.leg(),second),first.walking()+transfer.walking()+destination.walk(),timing.alightSeconds()+destination.walk(),
                            first.penalty()+penalty(level,preference)+(preference==Preference.FASTEST?0:120),now));
                    }
                }
            }
        }
        var unique=new LinkedHashMap<String,Option>();
        int fewestBoardings=results.stream().mapToInt(o->o.legs().size()).min().orElse(0);
        results.removeIf(o->o.legs().size()>fewestBoardings);
        results.sort(ranking(preference));
        for(var option:results) {
            String signature=option.legs().stream().map(l->l.routeId()+":"+l.pathIndex()).collect(Collectors.joining("/"));
            unique.putIfAbsent(signature,option);if(unique.size()==5)break;
        }
        return new Plan(now,List.copyOf(unique.values()),"DIRECT_OR_ONE_TRANSFER",
            "Başlanğıcdan 800m daxilində xidmət edilən bütün dayanacaqlar, təyinatdan 1 km daxilində ən yaxın 8 dayanacaq yoxlanılır. Əvvəlcə ən az aktarma; yalnız birbaşa yol yoxdursa 1 aktarma. Piyada məsafəsi təxminidir. Dayanacaq uyğunluğu 35m yaxınlıq modelidir, rəsmi xidmət/cədvəl deyil.");
    }
    private List<First> pareto(List<First> labels) {
        labels.sort(Comparator.comparingDouble(First::arrival).thenComparingLong(f->f.leg().rideSeconds()).thenComparingLong(First::walking));
        var result=new ArrayList<First>();
        Map<String,Long> bestPenalty=new HashMap<>();
        // Keep separate last-route groups because a transfer must change routes.
        for(var label:labels) if(label.penalty()<bestPenalty.getOrDefault(label.leg().routeId(),Long.MAX_VALUE)) {
            bestPenalty.put(label.leg().routeId(),label.penalty());result.add(label);
        }
        return result;
    }
    private List<Nearby> nearby(double lat,double lon) { return nearby(lat,lon,800); }
    private List<Nearby> nearby(double lat,double lon,int maxMeters) {
        return stops.values().stream().filter(s->transferNeighbors.containsKey(s.id())).map(s->new Nearby(s,(long)Math.ceil(geometry.distance(lat,lon,s.latitude(),s.longitude()))))
            .filter(n->n.walk()<maxMeters).sorted(Comparator.comparingLong(Nearby::walk)).limit(8).toList();
        // walking seconds = straight-line metres * 1.25 detour / 1.25 m/s
    }
    private List<Nearby> nearby(double lat,double lon,String selectedId) {
        if(selectedId==null || selectedId.isBlank()) return nearby(lat,lon);
        var selected=stops.get(selectedId);
        if(selected==null) throw az.transit.shared.ApiException.notFound("Dayanacaq tapılmadı");
        long distance=(long)Math.ceil(geometry.distance(lat,lon,selected.latitude(),selected.longitude()));
        return distance<=800?List.of(new Nearby(selected,distance)):List.of();
    }
    public static Comparator<Option> ranking(Preference preference) {
        Comparator<Option> time=Comparator.comparingLong(Option::totalSeconds)
            .thenComparingLong(o->o.legs().stream().mapToLong(Leg::rideSeconds).sum())
            .thenComparingLong(Option::walkingSeconds);
        if(preference==Preference.ECONOMY) return Comparator.<Option>comparingInt(o->o.legs().size()).thenComparing(time);
        if(preference==Preference.COMFORT) return Comparator.comparingLong(Option::crowdPenaltySeconds).thenComparing(time);
        return Comparator.<Option>comparingLong(o->o.totalSeconds()+o.crowdPenaltySeconds()).thenComparing(time);
    }
    private String key(String route,int path) { return route+":"+path; }
    private List<Double> phases(Pattern p,String stop,boolean simulated) {
        var forward=p.stops().get(stop);
        if(p.closed() || !simulated) return forward;
        return forward.stream().flatMap(value->java.util.stream.Stream.of(value,p.cycle()-value)).distinct().toList();
    }
    private JourneyTiming.Timing timing(Pattern p,Vehicle v,String from,String to,double ready,Instant now) {
        boolean simulated=v.source().equals("SIMULATED");
        double speed=(v.speedKmh()<3?18:v.speedKmh())/3.6;
        double progress=v.progressMeters();
        if(simulated) progress+=Math.max(0,Duration.between(v.observedAt(),now).toMillis()/1000.0)*speed;
        return JourneyTiming.ride(progress,speed,p.cycle(),simulated||p.closed(),simulated&&!p.closed(),phases(p,from,simulated),phases(p,to,simulated),ready);
    }
    private Leg leg(Pattern p,Vehicle v,String from,String to,JourneyTiming.Timing timing,double ready,CrowdLevel level,Instant now) {
        return new Leg(p.route().id(),p.route().number(),v.id(),p.pathIndex(),stops.get(from),stops.get(to),
            now.plusSeconds((long)Math.ceil(timing.boardSeconds())),now.plusSeconds((long)Math.ceil(timing.alightSeconds())),
            (long)Math.ceil(timing.boardSeconds())-(long)Math.ceil(ready),
            (long)Math.ceil(timing.alightSeconds())-(long)Math.ceil(timing.boardSeconds()),level,
            timing.boardProgress(),timing.alightProgress());
    }
    public static long penalty(CrowdLevel level,Preference preference) {
        if(preference==Preference.FASTEST || preference==Preference.ECONOMY)return 0;
        int value=switch(level) {case HIGH->600;case MEDIUM->180;case UNKNOWN->120;case LOW->0;};
        return preference==Preference.COMFORT?value*2L:value;
    }
    private Option option(List<Leg> legs,long walking,double total,long penalty,Instant now) {
        long seconds=walking+legs.stream().mapToLong(l->l.waitSeconds()+l.rideSeconds()).sum()+60L*Math.max(0,legs.size()-1);
        return new Option(legs,walking,seconds,penalty,now.plusSeconds(seconds),Math.max(120,(long)(seconds*.2)),
            "Sıralama: ümumi vaxt + sıxlıq/aktarma çəkisi. Çəki faktiki səyahət vaxtına əlavə olunmur.");
    }
}
