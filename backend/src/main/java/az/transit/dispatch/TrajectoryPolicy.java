package az.transit.dispatch;

import java.util.Comparator;
import org.springframework.stereotype.Component;
import az.transit.network.*;

/** Only complete, continuous catalogue geometry can be dispatched; never bridge disconnected paths. */
@Component
public class TrajectoryPolicy {
    public record Endpoint(String label,double latitude,double longitude) {}
    public record Trajectory(String id,boolean assignable,String reason,Endpoint start,Endpoint end,
                             double distanceKm,int nearbyStops,String source) {}
    private final RouteGeometry geometry;
    public TrajectoryPolicy(RouteGeometry geometry) { this.geometry=geometry; }
    public Trajectory describe(TransitRoute route) {
        if(route.paths().size()!=1) return blocked(route,"Mənbədə bir neçə ayrı xətt var. Tam və fasiləsiz trayektoriya təsdiqlənmədiyindən təyinat bağlıdır.");
        var path=route.paths().getFirst();
        if(path.points().size()<2) return blocked(route,"Trayektoriya üçün yetərli koordinat yoxdur.");
        for(int i=0;i<path.points().size();i++) {
            var p=path.points().get(i);
            if(!Double.isFinite(p.latitude()) || !Double.isFinite(p.longitude()) || Math.abs(p.latitude())>90 || Math.abs(p.longitude())>180)
                return blocked(route,"Trayektoriyada etibarsız koordinat var.");
            if(i>0) {
                var previous=path.points().get(i-1);
                if(geometry.distance(previous.latitude(),previous.longitude(),p.latitude(),p.longitude())>5000)
                    return blocked(route,"Koordinatlar arasında 5 km-dən böyük boşluq var; məlumat yoxlanmalıdır.");
            }
        }
        return new Trajectory(route.id()+":FULL",true,"Tam kataloq trayektoriyası · həndəsə yoxlanıb",
            endpoint(route,path.points().getFirst()),endpoint(route,path.points().getLast()),
            Math.round(geometry.length(route,0)/100.0)/10.0,route.stops().size(),route.source());
    }
    private Endpoint endpoint(TransitRoute route,Coordinate point) {
        var nearby=route.stops().stream().min(Comparator.comparingDouble(s->geometry.distance(point.latitude(),point.longitude(),s.latitude(),s.longitude())));
        String label=nearby.filter(s->geometry.distance(point.latitude(),point.longitude(),s.latitude(),s.longitude())<=250)
            .map(s->s.name()+" yaxınlığı").orElse(String.format(java.util.Locale.ROOT,"%.4f, %.4f",point.latitude(),point.longitude()));
        return new Endpoint(label,point.latitude(),point.longitude());
    }
    private Trajectory blocked(TransitRoute route,String reason) {
        return new Trajectory(route.id()+":FULL",false,reason,null,null,0,route.stops().size(),route.source());
    }
}
