package az.transit.presence;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/presence")
public class PresenceController {
    public record Start(@NotNull UUID reporterId,@NotBlank String vehicleId,@AssertTrue boolean consent) {}
    public record Sample(@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotNull @DecimalMin("0.1") @DecimalMax("100000") Double accuracy,@NotNull Instant observedAt) {}
    private final PresenceService service;
    public PresenceController(PresenceService service) { this.service=service; }
    @PostMapping public Map<String,String> start(@Valid @RequestBody Start request) {
        return Map.of("sessionId",service.start(request.reporterId().toString(),request.vehicleId()));
    }
    @PostMapping("/{id}/sample") public PresenceService.Result sample(@PathVariable UUID id,@Valid @RequestBody Sample request) {
        return service.sample(id.toString(),request.latitude(),request.longitude(),request.accuracy(),request.observedAt());
    }
    @PostMapping("/{id}/end") public void end(@PathVariable UUID id) { service.end(id.toString()); }
}
