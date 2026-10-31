package az.transit.telemetry;
import java.time.Instant;
public record Vehicle(String id, String routeId, double latitude, double longitude, double progressMeters,
                      double speedKmh, Instant observedAt, String source, int pathIndex) {
    public Vehicle(String id,String routeId,double latitude,double longitude,double progressMeters,
                   double speedKmh,Instant observedAt,String source) {
        this(id,routeId,latitude,longitude,progressMeters,speedKmh,observedAt,source,0);
    }
}
