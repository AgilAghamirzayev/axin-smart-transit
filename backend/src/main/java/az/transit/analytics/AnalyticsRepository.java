package az.transit.analytics;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import az.transit.shared.ApiException;

@Repository
public class AnalyticsRepository {
    public record State(Instant highSince,Instant lastEvaluated) {}
    private final JdbcTemplate jdbc;
    public AnalyticsRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    private Instant instant(java.sql.ResultSet rs,String key) throws java.sql.SQLException {
        var value=rs.getObject(key,OffsetDateTime.class); return value==null?null:value.toInstant();
    }
    private OffsetDateTime sqlTime(Instant value) { return value==null?null:value.atOffset(ZoneOffset.UTC); }
    public State lockState(String routeId) {
        return jdbc.queryForObject("select * from route_state where route_id=? for update",
            (rs,i)->new State(instant(rs,"high_since"),instant(rs,"last_evaluated")),routeId);
    }
    public State state(String routeId) {
        return jdbc.queryForObject("select * from route_state where route_id=?",
            (rs,i)->new State(instant(rs,"high_since"),instant(rs,"last_evaluated")),routeId);
    }
    public Map<String,State> states() {
        Map<String,State> states=new HashMap<>();
        jdbc.query("select * from route_state",(org.springframework.jdbc.core.RowCallbackHandler) rs ->
            states.put(rs.getString("route_id"),new State(instant(rs,"high_since"),instant(rs,"last_evaluated"))));
        return states;
    }
    public void saveState(String routeId,Instant since,Instant now) {
        jdbc.update("update route_state set high_since=?,last_evaluated=? where route_id=?",sqlTime(since),sqlTime(now),routeId);
    }
    public List<Alert> alerts() {
        return jdbc.query("select * from alert order by triggered_at desc limit 100",
            (rs,i)->new Alert(rs.getString("id"),rs.getString("route_id"),instant(rs,"started_at"),
                instant(rs,"triggered_at"),instant(rs,"resolved_at"),instant(rs,"acknowledged_at")));
    }
    public void openIfAbsent(String routeId,Instant since,Instant now) {
        Integer count=jdbc.queryForObject("select count(*) from alert where route_id=? and resolved_at is null",Integer.class,routeId);
        if(count!=null && count==0)
            jdbc.update("insert into alert(id,route_id,started_at,triggered_at) values (?,?,?,?)",
                UUID.randomUUID().toString(),routeId,sqlTime(since),sqlTime(now));
    }
    public void resolve(String routeId,Instant now) {
        jdbc.update("update alert set resolved_at=? where route_id=? and resolved_at is null",sqlTime(now),routeId);
    }
    public void acknowledge(String id,Instant now) {
        int count=jdbc.update("update alert set acknowledged_at=coalesce(acknowledged_at,?) where id=?",sqlTime(now),id);
        if(count==0) throw ApiException.notFound("Xəbərdarlıq tapılmadı");
    }
}
