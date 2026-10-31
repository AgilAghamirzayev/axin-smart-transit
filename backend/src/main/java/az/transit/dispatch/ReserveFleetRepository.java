package az.transit.dispatch;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ReserveFleetRepository {
    public record Bus(String id,String allowedRouteId,int capacity,String status) {}
    private final JdbcTemplate jdbc;
    public ReserveFleetRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<Bus> forRoute(String route) {
        return jdbc.query("select * from reserve_bus where allowed_route_id=? order by id",
            (rs,i)->new Bus(rs.getString("id"),rs.getString("allowed_route_id"),rs.getInt("capacity"),rs.getString("status")),route);
    }
    public boolean claim(String id,String route) {
        return jdbc.update("update reserve_bus set status='ASSIGNED' where id=? and allowed_route_id=? and status='READY'",id,route)==1;
    }
}
