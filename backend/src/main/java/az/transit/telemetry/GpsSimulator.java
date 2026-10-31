package az.transit.telemetry;

import java.time.Clock;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import az.transit.network.*;

@Component
@ConditionalOnProperty(name="transit.simulator-enabled",havingValue="true")
public class GpsSimulator {
    private final VehicleRepository vehicles;
    private final NetworkRepository network;
    private final RouteGeometry geometry;
    private final Clock clock;
    public GpsSimulator(VehicleRepository vehicles,NetworkRepository network,RouteGeometry geometry,Clock clock) {
        this.vehicles=vehicles;this.network=network;this.geometry=geometry;this.clock=clock;
    }
    @Scheduled(fixedDelay=3000,initialDelay=1000)
    @Transactional
    public void tick() {
        var now=clock.instant();
        var existing=vehicles.all();
        for(var vehicle:existing) {
            if(!vehicle.source().equals("SIMULATED") || !network.containsRoute(vehicle.routeId())) continue;
            var route=network.route(vehicle.routeId());
            double elapsed=Math.min(10,Duration.between(vehicle.observedAt(),now).toMillis()/1000.0);
            var p=geometry.at(route,vehicle.pathIndex(),vehicle.progressMeters()+elapsed*vehicle.speedKmh()/3.6);
            vehicles.update(new Vehicle(vehicle.id(),route.id(),p.latitude(),p.longitude(),p.progressMeters(),
                vehicle.speedKmh(),now,"SIMULATED",vehicle.pathIndex()));
        }
    }
}
