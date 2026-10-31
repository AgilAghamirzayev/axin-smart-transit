package az.transit.dispatch;
import java.security.Principal;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/operator/dispatches")
public class DispatchController {
    public record Request(@NotNull UUID requestId,@NotBlank String routeId,@NotBlank String trajectoryId,@NotBlank String reserveVehicleId) {}
    private final DispatchService service;
    public DispatchController(DispatchService service) { this.service=service; }
    @GetMapping("/options") public DispatchService.Options options(@RequestParam String routeId) { return service.options(routeId); }
    @GetMapping public List<DispatchService.Order> history() { return service.history(); }
    @PostMapping public DispatchService.Order dispatch(@Valid @RequestBody Request request,Principal principal) {
        return service.dispatch(request.requestId().toString(),request.routeId(),request.trajectoryId(),request.reserveVehicleId(),principal.getName());
    }
}
