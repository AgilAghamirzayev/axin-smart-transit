package az.transit.crowding;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final ReportService service;
    public ReportController(ReportService service) { this.service=service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public CrowdReport submit(@Valid @RequestBody ReportService.Submission input) { return service.submit(input); }
}
