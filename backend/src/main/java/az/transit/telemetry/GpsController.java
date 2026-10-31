package az.transit.telemetry;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/telemetry")
public class GpsController {
    private final GpsService service;
    public GpsController(GpsService service) { this.service=service; }
    @PutMapping("/vehicles/{id}")
    public Vehicle update(@PathVariable String id,@Valid @RequestBody GpsService.GpsUpdate input) {
        return service.accept(id,input);
    }
}
