package az.transit.journey;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/journeys")
public class JourneyController {
    public record Request(@NotNull @DecimalMin("-90") @DecimalMax("90") Double fromLatitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double fromLongitude,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double toLatitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double toLongitude,
        @NotNull JourneyService.Preference preference, @Size(max=100) String fromStopId, @Size(max=100) String toStopId) {}
    private final JourneyService service;
    public JourneyController(JourneyService service) { this.service=service; }
    @PostMapping("/plan") public JourneyService.Plan plan(@Valid @RequestBody Request request) {
        return service.plan(request.fromLatitude(),request.fromLongitude(),request.toLatitude(),request.toLongitude(),request.preference(),request.fromStopId(),request.toStopId());
    }
}
