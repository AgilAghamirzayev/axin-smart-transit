package az.transit.passenger;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import az.transit.network.*;
import az.transit.telemetry.*;
import az.transit.crowding.*;
import az.transit.analytics.*;
import az.transit.shared.*;
import az.transit.presence.*;

@Service
public class TransitQueryService {
    public record VehicleView(String id,String routeId,double latitude,double longitude,double speedKmh,
        Instant observedAt,String source,boolean stale,CrowdLevel crowdLevel,Integer etaMinutes,int pathIndex,double progressMeters,int gpsParticipants,int nominalCapacity) {}
    public record Snapshot(Instant generatedAt,boolean simulation,long anomalyDurationSeconds,
        int minimumReporters,double highRatioThreshold,long reportFreshnessSeconds,long gpsFreshnessSeconds,
        List<VehicleView> vehicles,List<AnalyticsService.RouteAnalytics> analytics) {}
    private final NetworkRepository network;
    private final VehicleRepository vehicles;
    private final ReportRepository reports;
    private final CrowdingPolicy crowding;
    private final RouteGeometry geometry;
    private final AnalyticsService analytics;
    private final TransitProperties properties;
    private final Clock clock;
    private final PresenceService presence;
    private final OccupancyPolicy occupancy;
    public TransitQueryService(NetworkRepository network,VehicleRepository vehicles,ReportRepository reports,
        CrowdingPolicy crowding,RouteGeometry geometry,AnalyticsService analytics,TransitProperties properties,Clock clock,PresenceService presence,OccupancyPolicy occupancy) {
        this.network=network;this.vehicles=vehicles;this.reports=reports;this.crowding=crowding;
        this.geometry=geometry;this.analytics=analytics;this.properties=properties;this.clock=clock;
        this.presence=presence;this.occupancy=occupancy;
    }
    public Snapshot snapshot(String routeId,String stopId) {
        var now=clock.instant();
        var routes=network.routes();
        if(routeId!=null) network.route(routeId);
        if(stopId!=null && !network.containsStop(stopId))
            throw ApiException.notFound("Dayanacaq tapılmadı");
        if(routeId!=null && stopId!=null && network.stops(routeId).stream().noneMatch(s->s.id().equals(stopId)))
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,"Dayanacaq seçilmiş marşrutda deyil");
        var recent=reports.since(now.minus(properties.reportFreshness()));
        var gpsCounts=presence.counts();
        var views=vehicles.all().stream().filter(v->network.containsRoute(v.routeId()))
            .filter(v->routeId==null || v.routeId().equals(routeId))
            .filter(v->stopId==null || network.stops(v.routeId()).stream().anyMatch(s->s.id().equals(stopId)))
            .filter(v->stopId==null || network.route(v.routeId()).source().equals("DEMO") || network.route(v.routeId()).stopMatches().stream()
                .anyMatch(m->m.stopId().equals(stopId) && m.pathIndex()==v.pathIndex()))
            .map(v->{
                boolean stale=v.observedAt().isBefore(now.minus(properties.gpsFreshness()));
                var level=stale?CrowdLevel.UNKNOWN:crowding.summarize(recent.stream().filter(r->r.vehicleId().equals(v.id())).toList(),
                    1,properties.highRatio()).level();
                Integer eta=stale || stopId==null?null:geometry.etaMinutes(network.route(v.routeId()),v.pathIndex(),v.progressMeters(),v.speedKmh(),stopId,v.source().equals("SIMULATED"));
                int participants=stale?0:gpsCounts.getOrDefault(v.id(),0);
                return new VehicleView(v.id(),v.routeId(),v.latitude(),v.longitude(),v.speedKmh(),v.observedAt(),v.source(),stale,occupancy.combine(level,participants),eta,v.pathIndex(),v.progressMeters(),participants,occupancy.capacity());
            }).sorted(Comparator.comparing(v->v.etaMinutes()==null?Integer.MAX_VALUE:v.etaMinutes())).toList();
        return new Snapshot(now,properties.simulatorEnabled(),properties.highDuration().toSeconds(),
            properties.minReporters(),properties.highRatio(),properties.reportFreshness().toSeconds(),
            properties.gpsFreshness().toSeconds(),views,analytics.snapshot());
    }
}
