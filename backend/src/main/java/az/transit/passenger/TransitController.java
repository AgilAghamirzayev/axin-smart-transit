package az.transit.passenger;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/transit")
public class TransitController {
    private final TransitQueryService service;
    private final az.transit.network.NetworkRepository network;
    public TransitController(TransitQueryService service,az.transit.network.NetworkRepository network) { this.service=service; this.network=network; }
    @GetMapping("/network")
    public az.transit.network.NetworkRepository.Catalog network() { return network.catalog(); }
    @GetMapping("/snapshot")
    public TransitQueryService.Snapshot snapshot(@RequestParam(required=false) String routeId,
        @RequestParam(required=false) String stopId) { return service.snapshot(routeId,stopId); }
}
