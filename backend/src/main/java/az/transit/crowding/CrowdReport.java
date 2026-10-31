package az.transit.crowding;
import java.time.Instant;
public record CrowdReport(String id,String vehicleId,String routeId,String reporterId,CrowdLevel level,Instant createdAt) {}
