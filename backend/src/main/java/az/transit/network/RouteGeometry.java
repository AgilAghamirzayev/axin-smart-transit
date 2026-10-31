package az.transit.network;
import java.util.*;
import org.springframework.stereotype.Component;

/** Open paths turn back; disconnected LineStrings are never joined. */
@Component
public class RouteGeometry {
    public record Position(double latitude,double longitude,double progressMeters,double distanceFromRoute) {}
    private record Measure(double[] cumulative,double length) {}
    private final Map<RoutePath,Measure> measures=Collections.synchronizedMap(new IdentityHashMap<>());
    public double distance(double lat1,double lon1,double lat2,double lon2) {
        double a=Math.pow(Math.sin(Math.toRadians(lat2-lat1)/2),2)
            +Math.cos(Math.toRadians(lat1))*Math.cos(Math.toRadians(lat2))*Math.pow(Math.sin(Math.toRadians(lon2-lon1)/2),2);
        return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
    }
    private Measure measure(RoutePath path) {
        return measures.computeIfAbsent(path,p-> {
            double[] cumulative=new double[p.points().size()];
            for(int i=1;i<cumulative.length;i++) {
                var a=p.points().get(i-1);var b=p.points().get(i);
                cumulative[i]=cumulative[i-1]+distance(a.latitude(),a.longitude(),b.latitude(),b.longitude());
            }
            double length=cumulative[cumulative.length-1];
            if(length<=0) throw new IllegalArgumentException("Degenerate route");
            return new Measure(cumulative,length);
        });
    }
    private RoutePath path(TransitRoute route,int index) {
        if(index<0 || index>=route.paths().size()) throw new IllegalArgumentException("Invalid path index");
        return route.paths().get(index);
    }
    public double length(TransitRoute route) { return length(route,0); }
    public double length(TransitRoute route,int index) { return measure(path(route,index)).length(); }
    public double cycleLength(TransitRoute route,int index) { return length(route,index)*(path(route,index).closed()?1:2); }
    private double normalize(double progress,double cycle) { return ((progress%cycle)+cycle)%cycle; }
    public Position at(TransitRoute route,double progress) { return at(route,0,progress); }
    public Position at(TransitRoute route,int index,double progress) {
        var path=path(route,index);var measured=measure(path);
        double normalized=normalize(progress,cycleLength(route,index));
        double offset=normalized>measured.length()?2*measured.length()-normalized:normalized;
        int segment=Arrays.binarySearch(measured.cumulative(),offset);
        if(segment<0) segment=-segment-2;
        segment=Math.max(0,Math.min(segment,path.points().size()-2));
        var a=path.points().get(segment);var b=path.points().get(segment+1);
        double span=measured.cumulative()[segment+1]-measured.cumulative()[segment];
        double fraction=span==0?0:(offset-measured.cumulative()[segment])/span;
        return new Position(a.latitude()+(b.latitude()-a.latitude())*fraction,
            a.longitude()+(b.longitude()-a.longitude())*fraction,normalized,0);
    }
    public Position project(TransitRoute route,double lat,double lon) { return project(route,0,lat,lon); }
    public Position project(TransitRoute route,int index,double lat,double lon) {
        var path=path(route,index);var measured=measure(path);
        Position best=null;double scale=Math.cos(Math.toRadians(lat));
        for(int i=0;i<path.points().size()-1;i++) {
            var a=path.points().get(i);var b=path.points().get(i+1);
            double dx=(b.longitude()-a.longitude())*scale,dy=b.latitude()-a.latitude(),denominator=dx*dx+dy*dy;
            double t=denominator==0?0:Math.max(0,Math.min(1,((lon-a.longitude())*scale*dx+(lat-a.latitude())*dy)/denominator));
            double pLat=a.latitude()+t*dy,pLon=a.longitude()+t*(b.longitude()-a.longitude());
            double delta=distance(lat,lon,pLat,pLon);
            if(best==null || delta<best.distanceFromRoute()) best=new Position(pLat,pLon,
                measured.cumulative()[i]+t*(measured.cumulative()[i+1]-measured.cumulative()[i]),delta);
        }
        return best;
    }
    public double stopProgress(TransitRoute route,String stopId) {
        return stopProgresses(route,0,stopId).stream().findFirst()
            .orElseThrow(()->az.transit.shared.ApiException.notFound("Dayanacaq bu marşrutda yoxdur"));
    }
    private List<Double> stopProgresses(TransitRoute route,int index,String stopId) {
        if(route.source().equals("DEMO")) return route.stops().stream().filter(s->s.id().equals(stopId))
            .map(s->project(route,index,s.latitude(),s.longitude()).progressMeters()).toList();
        return route.stopMatches().stream().filter(m->m.stopId().equals(stopId) && m.pathIndex()==index)
            .map(StopMatch::progressMeters).toList();
    }
    public Integer etaMinutes(TransitRoute route,double progress,double speed,String stopId) {
        if(route.stops().stream().noneMatch(s->s.id().equals(stopId)))
            throw az.transit.shared.ApiException.notFound("Dayanacaq bu marşrutda yoxdur");
        return etaMinutes(route,0,progress,speed,stopId,true);
    }
    public Integer etaMinutes(TransitRoute route,int index,double progress,double speed,String stopId,boolean simulated) {
        var targets=stopProgresses(route,index,stopId);
        if(targets.isEmpty()) return null;
        double cycle=cycleLength(route,index),current=normalize(progress,cycle),best=Double.POSITIVE_INFINITY;
        for(double target:targets) {
            if(!simulated && !path(route,index).closed()) {
                if(target>=current) best=Math.min(best,target-current);
            } else {
                best=Math.min(best,normalize(target-current,cycle));
                if(!path(route,index).closed()) best=Math.min(best,normalize(cycle-target-current,cycle));
            }
        }
        return Double.isFinite(best)?(int)Math.ceil(best/((speed<3?18:speed)/3.6)/60):null;
    }
}
