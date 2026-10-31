package az.transit.analytics;

import java.time.*;
import java.util.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import az.transit.network.*;
import az.transit.telemetry.*;
import az.transit.crowding.*;
import az.transit.shared.TransitProperties;
import az.transit.presence.*;

@Service
public class AnalyticsService {
    public record RouteAnalytics(String routeId,CrowdLevel level,int activeVehicles,int totalVehicles,
        int reporters,int highReports,double highRatio,Instant highSince,long highSeconds,int gpsParticipants,int nominalCapacity) {}
    private final NetworkRepository network;
    private final VehicleRepository vehicles;
    private final ReportRepository reports;
    private final AnalyticsRepository repository;
    private final CrowdingPolicy crowding;
    private final AnomalyPolicy anomaly;
    private final TransitProperties properties;
    private final Clock clock;
    private final PresenceService presence;
    private final OccupancyPolicy occupancy;
    public AnalyticsService(NetworkRepository network,VehicleRepository vehicles,ReportRepository reports,
        AnalyticsRepository repository,CrowdingPolicy crowding,AnomalyPolicy anomaly,TransitProperties properties,Clock clock,PresenceService presence,OccupancyPolicy occupancy) {
        this.network=network;this.vehicles=vehicles;this.reports=reports;this.repository=repository;
        this.crowding=crowding;this.anomaly=anomaly;this.properties=properties;this.clock=clock;
        this.presence=presence;this.occupancy=occupancy;
    }
    public List<RouteAnalytics> snapshot() {
        var now=clock.instant();
        var fleet=vehicles.all().stream().filter(v->network.containsRoute(v.routeId())).toList();
        var states=repository.states();
        var gpsCounts=presence.counts();
        var freshIds=fleet.stream().filter(v->!v.observedAt().isBefore(now.minus(properties.gpsFreshness())))
            .map(Vehicle::id).collect(java.util.stream.Collectors.toSet());
        var recent=reports.since(now.minus(properties.reportFreshness())).stream()
            .filter(r->freshIds.contains(r.vehicleId())).toList();
        return network.routes().stream().map(route->{
            var summary=crowding.summarize(recent.stream().filter(r->r.routeId().equals(route.id())).toList(),
                properties.minReporters(),properties.highRatio());
            var state=states.get(route.id());
            var routeFleet=fleet.stream().filter(v->v.routeId().equals(route.id()) && freshIds.contains(v.id())).toList();
            int gpsParticipants=routeFleet.stream().mapToInt(v->gpsCounts.getOrDefault(v.id(),0)).sum();
            int peakGps=routeFleet.stream().mapToInt(v->gpsCounts.getOrDefault(v.id(),0)).max().orElse(0);
            var combined=occupancy.combine(summary.level(),peakGps);
            boolean continuity=combined==CrowdLevel.HIGH && state.lastEvaluated()!=null &&
                !state.lastEvaluated().plus(properties.reportFreshness()).isBefore(now);
            var since=continuity?state.highSince():null;
            return new RouteAnalytics(route.id(),combined,
                (int)fleet.stream().filter(v->v.routeId().equals(route.id()) && freshIds.contains(v.id())).count(),
                (int)fleet.stream().filter(v->v.routeId().equals(route.id())).count(),
                summary.reporters(),summary.highReports(),summary.highRatio(),since,
                since==null?0:Duration.between(since,now).toSeconds(),gpsParticipants,occupancy.capacity());
        }).toList();
    }
    @Scheduled(fixedDelay=3000,initialDelayString="${transit.analytics-initial-delay-ms:2000}")
    @Transactional
    public void evaluate() {
        var now=clock.instant();
        for(var summary:snapshot()) {
            var previous=repository.lockState(summary.routeId());
            var decision=anomaly.evaluate(summary.level()==CrowdLevel.HIGH,previous.highSince(),
                previous.lastEvaluated(),now,properties.highDuration(),properties.reportFreshness());
            repository.saveState(summary.routeId(),decision.highSince(),now);
            if(decision.alertRequired()) repository.openIfAbsent(summary.routeId(),decision.highSince(),now);
            // A continuity gap also resolves the preceding episode.
            if(decision.highSince()==null || !Objects.equals(previous.highSince(),decision.highSince()))
                repository.resolve(summary.routeId(),now);
        }
    }
}
