package az.transit.operator;
import java.time.Clock;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import az.transit.passenger.TransitQueryService;
import az.transit.analytics.*;

@RestController
@RequestMapping("/api/operator")
public class OperatorController {
    public record Dashboard(TransitQueryService.Snapshot transit,List<Alert> alerts) {}
    private final TransitQueryService transit;
    private final AnalyticsRepository analytics;
    private final Clock clock;
    public OperatorController(TransitQueryService transit,AnalyticsRepository analytics,Clock clock) {
        this.transit=transit;this.analytics=analytics;this.clock=clock;
    }
    @GetMapping("/snapshot") public Dashboard snapshot() {
        var snapshot=transit.snapshot(null,null);
        var routeIds=snapshot.analytics().stream().map(AnalyticsService.RouteAnalytics::routeId).collect(java.util.stream.Collectors.toSet());
        return new Dashboard(snapshot,analytics.alerts().stream().filter(a->routeIds.contains(a.routeId())).toList());
    }
    @PostMapping("/alerts/{id}/acknowledge")
    public void acknowledge(@PathVariable String id) { analytics.acknowledge(id,clock.instant()); }
}
