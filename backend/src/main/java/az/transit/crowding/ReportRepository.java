package az.transit.crowding;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ReportRepository {
    private final JdbcTemplate jdbc;
    public ReportRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void lockWrites() {
        jdbc.queryForObject("select id from report_write_lock where id=1 for update", Integer.class);
    }
    private org.springframework.jdbc.core.RowMapper<CrowdReport> mapper() {
        return (rs,i)->new CrowdReport(rs.getString("id"),rs.getString("vehicle_id"),rs.getString("route_id"),
            rs.getString("reporter_id"),CrowdLevel.valueOf(rs.getString("level")),
            rs.getObject("created_at",OffsetDateTime.class).toInstant());
    }
    public Optional<CrowdReport> find(String id) {
        return jdbc.query("select * from crowd_report where id=?",mapper(),id).stream().findFirst();
    }
    public List<CrowdReport> since(Instant cutoff) {
        return jdbc.query("select * from crowd_report where created_at>=? order by created_at desc",
            mapper(),cutoff.atOffset(ZoneOffset.UTC));
    }
    public Optional<Instant> lastByReporter(String reporter) {
        return jdbc.query("select created_at from crowd_report where reporter_id=? order by created_at desc limit 1",
            (rs,i)->rs.getObject(1,OffsetDateTime.class).toInstant(),reporter).stream().findFirst();
    }
    public void save(CrowdReport report) {
        jdbc.update("insert into crowd_report values (?,?,?,?,?,?)",report.id(),report.vehicleId(),report.routeId(),
            report.reporterId(),report.level().name(),report.createdAt().atOffset(ZoneOffset.UTC));
    }
}
