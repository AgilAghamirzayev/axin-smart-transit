package az.transit.presence;

import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import az.transit.shared.ApiException;

@Repository
public class PresenceRepository {
    public record Session(String id,String vehicleId,Instant firstSeen,Instant lastSeen,Instant lastObserved,int fixes,boolean verified) {}
    private final JdbcTemplate jdbc;
    public PresenceRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    private static OffsetDateTime date(Instant value) { return value==null?null:value.atOffset(ZoneOffset.UTC); }
    public void lock() { jdbc.queryForObject("select id from report_write_lock where id=1 for update",Integer.class); }
    public void replace(String id,String reporter,String vehicle,Instant now) {
        jdbc.update("delete from presence_session where reporter_id=?",reporter);
        jdbc.update("insert into presence_session(session_id,reporter_id,vehicle_id,last_seen) values(?,?,?,?)",id,reporter,vehicle,date(now));
    }
    public Session get(String id) {
        return jdbc.query("select * from presence_session where session_id=? for update",(rs,i)->{
            var first=rs.getObject("first_seen",OffsetDateTime.class);
            var observed=rs.getObject("last_observed",OffsetDateTime.class);
            return new Session(id,rs.getString("vehicle_id"),first==null?null:first.toInstant(),
                rs.getObject("last_seen",OffsetDateTime.class).toInstant(),observed==null?null:observed.toInstant(),rs.getInt("fix_count"),rs.getBoolean("verified"));
        },id).stream().findFirst().orElseThrow(()->ApiException.notFound("Məkan sessiyası bitib"));
    }
    public void save(Session s) {
        jdbc.update("update presence_session set first_seen=?,last_seen=?,last_observed=?,fix_count=?,verified=? where session_id=?",
            date(s.firstSeen()),date(s.lastSeen()),date(s.lastObserved()),s.fixes(),s.verified(),s.id());
    }
    public void end(String id) { jdbc.update("delete from presence_session where session_id=?",id); }
    public void purge(Instant cutoff) { jdbc.update("delete from presence_session where last_seen<?",date(cutoff)); }
    public Map<String,Integer> counts(Instant cutoff) {
        var result=new HashMap<String,Integer>();
        jdbc.query("select vehicle_id,count(*) n from presence_session where verified=true and last_seen>=? group by vehicle_id",
            (org.springframework.jdbc.core.RowCallbackHandler)rs->result.put(rs.getString(1),rs.getInt(2)),date(cutoff));
        return result;
    }
}
