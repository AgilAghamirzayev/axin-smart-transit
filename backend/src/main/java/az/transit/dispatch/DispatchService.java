package az.transit.dispatch;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import az.transit.network.*;
import az.transit.telemetry.*;
import az.transit.analytics.AnalyticsRepository;
import az.transit.shared.*;

@Service
public class DispatchService {
    public record Order(String requestId,String routeId,int pathIndex,String vehicleId,Instant createdAt,String operatorName) {}
    public record Options(TrajectoryPolicy.Trajectory trajectory,List<ReserveFleetRepository.Bus> buses,String allocationSource) {}
    private final ReserveFleetRepository reserve;
    private final TrajectoryPolicy trajectories;
    private final JdbcTemplate jdbc;
    private final VehicleRepository vehicles;
    private final NetworkRepository network;
    private final RouteGeometry geometry;
    private final AnalyticsRepository analytics;
    private final TransitProperties properties;
    private final Clock clock;
    private final SimulationFleetPolicy fleetPolicy;
    public DispatchService(JdbcTemplate jdbc,VehicleRepository vehicles,NetworkRepository network,RouteGeometry geometry,AnalyticsRepository analytics,TransitProperties properties,Clock clock,ReserveFleetRepository reserve,TrajectoryPolicy trajectories,SimulationFleetPolicy fleetPolicy) {
        this.jdbc=jdbc;this.vehicles=vehicles;this.network=network;this.geometry=geometry;this.analytics=analytics;this.properties=properties;this.clock=clock;this.reserve=reserve;this.trajectories=trajectories;this.fleetPolicy=fleetPolicy;
    }
    public Options options(String routeId) {
        return new Options(trajectories.describe(network.route(routeId)),reserve.forRoute(routeId),
            "Lokal simulyasiya bölgüsü; rəsmi avtobus icazə reyestri deyil");
    }
    public List<Order> history() {
        return jdbc.query("select * from dispatch_order order by created_at desc limit 50",(rs,i)->new Order(rs.getString("request_id"),rs.getString("route_id"),rs.getInt("path_index"),rs.getString("vehicle_id"),rs.getObject("created_at",OffsetDateTime.class).toInstant(),rs.getString("operator_name")));
    }
    @Transactional public Order dispatch(String requestId,String routeId,String trajectoryId,String busId,String operator) {
        var route=network.route(routeId);
        var trajectory=trajectories.describe(route);
        if(!trajectory.id().equals(trajectoryId)) throw new ApiException(HttpStatus.BAD_REQUEST,"Trayektoriya seçilmiş marşruta aid deyil");
        int path=0;
        // Serialize request IDs across routes, including concurrent conflicting retries.
        jdbc.queryForObject("select id from report_write_lock where id=1 for update",Integer.class);
        analytics.lockState(routeId);
        var existing=jdbc.query("select * from dispatch_order where request_id=?",(rs,i)->new Order(requestId,rs.getString("route_id"),rs.getInt("path_index"),rs.getString("vehicle_id"),rs.getObject("created_at",OffsetDateTime.class).toInstant(),rs.getString("operator_name")),requestId);
        if(!existing.isEmpty()) {
            var order=existing.getFirst();
            if(!order.routeId().equals(routeId) || order.pathIndex()!=path || !order.vehicleId().equals(busId)) throw new ApiException(HttpStatus.CONFLICT,"Sorğu ID-si başqa göndərişə aiddir");
            return order;
        }
        if(!trajectory.assignable()) throw new ApiException(HttpStatus.CONFLICT,trajectory.reason());
        if(!properties.simulatorEnabled()) throw new ApiException(HttpStatus.CONFLICT,"Simulyator söndürülüb. Fiziki dispetçer inteqrasiyası qoşulmayıb");
        var now=clock.instant();
        if(jdbc.queryForObject("select count(*) from dispatch_order where route_id=? and created_at>?",Integer.class,routeId,now.minusSeconds(30).atOffset(ZoneOffset.UTC))>0)
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"Bu xəttə növbəti göndəriş üçün 30 saniyə gözləyin");
        var fleet=vehicles.all().stream().filter(v->v.routeId().equals(routeId) && v.pathIndex()==path).toList();
        int limit=Math.max(30,fleetPolicy.vehicleCount(geometry.cycleLength(route,path))+10);
        if(fleet.size()>=limit) throw new ApiException(HttpStatus.CONFLICT,"Bu trayektoriya üçün "+limit+" avtobus limiti dolub");
        if(!reserve.claim(busId,routeId)) throw new ApiException(HttpStatus.CONFLICT,"Avtobus bu xətt üçün ayrılmayıb və ya artıq təyin edilib. Siyahını yeniləyin.");
        // Depart from the catalogue start, never materialize in the middle of a route.
        var position=geometry.at(route,0,0);
        String id=busId;
        vehicles.insert(new Vehicle(id,routeId,position.latitude(),position.longitude(),0,fleetPolicy.speedKmh(),now,"SIMULATED",0));
        jdbc.update("insert into dispatch_order values(?,?,?,?,?,?)",requestId,routeId,path,id,now.atOffset(ZoneOffset.UTC),operator);
        return new Order(requestId,routeId,path,id,now,operator);
    }
}
