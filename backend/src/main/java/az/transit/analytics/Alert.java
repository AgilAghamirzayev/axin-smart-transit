package az.transit.analytics;
import java.time.Instant;
public record Alert(String id,String routeId,Instant startedAt,Instant triggeredAt,Instant resolvedAt,Instant acknowledgedAt) {}
