package az.transit.telemetry;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import az.transit.shared.ApiException;

@Repository
public class VehicleRepository {
    private final JdbcTemplate jdbc;
    public VehicleRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    private Vehicle map(ResultSet rs, int row) throws SQLException {
        return new Vehicle(rs.getString("id"),rs.getString("route_id"),rs.getDouble("latitude"),
            rs.getDouble("longitude"),rs.getDouble("progress_m"),rs.getDouble("speed_kmh"),
            rs.getObject("observed_at",OffsetDateTime.class).toInstant(),rs.getString("source"),rs.getInt("path_index"));
    }
    public List<Vehicle> all() { return jdbc.query("select * from vehicle order by id",this::map); }
    public Vehicle get(String id) {
        return jdbc.query("select * from vehicle where id=?",this::map,id).stream().findFirst()
            .orElseThrow(() -> ApiException.notFound("Avtobus tapılmadı"));
    }
    public void insert(Vehicle v) {
        jdbc.update("insert into vehicle values (?,?,?,?,?,?,?,?,?)",v.id(),v.routeId(),v.latitude(),v.longitude(),
            v.progressMeters(),v.speedKmh(),v.observedAt().atOffset(ZoneOffset.UTC),v.source(),v.pathIndex());
    }
    public boolean update(Vehicle v) {
        return jdbc.update("""
            update vehicle set latitude=?,longitude=?,progress_m=?,speed_kmh=?,observed_at=?,source=?
            where id=? and observed_at<? and (? <> 'SIMULATED' or source='SIMULATED')
            """,v.latitude(),v.longitude(),v.progressMeters(),v.speedKmh(),
            v.observedAt().atOffset(ZoneOffset.UTC),v.source(),v.id(),v.observedAt().atOffset(ZoneOffset.UTC),v.source())==1;
    }
}
