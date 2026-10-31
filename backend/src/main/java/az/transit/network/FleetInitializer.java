package az.transit.network;

import java.time.Instant;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import az.transit.telemetry.*;
import az.transit.shared.TransitProperties;

@Component
public class FleetInitializer implements ApplicationRunner {
    private final NetworkRepository network;
    private final VehicleRepository vehicles;
    private final RouteGeometry geometry;
    private final SimulationFleetPolicy fleetPolicy;
    private final TransitProperties properties;
    public FleetInitializer(NetworkRepository network,VehicleRepository vehicles,RouteGeometry geometry,
            SimulationFleetPolicy fleetPolicy,TransitProperties properties) {
        this.network=network;this.vehicles=vehicles;this.geometry=geometry;
        this.fleetPolicy=fleetPolicy;this.properties=properties;
    }
    @Override @Transactional
    public void run(ApplicationArguments args) {
        var existing=vehicles.all().stream().collect(Collectors.toMap(Vehicle::id,Function.identity()));
        var now=Instant.now();
        for(var route:network.routes()) for(int path=0;path<route.paths().size();path++) {
            boolean demo=route.source().equals("DEMO");
            double cycle=geometry.cycleLength(route,path);
            int count=demo?3:properties.simulatorEnabled()?fleetPolicy.vehicleCount(cycle):2;
            String prefix=demo?route.id()+"-":route.id()+"-P"+(path+1)+"-";
            double phase=existing.containsKey(prefix+"1")?existing.get(prefix+"1").progressMeters():cycle*.05;
            for(int i=0;i<count;i++) {
                String id=prefix+(i+1);
                var old=existing.get(id);
                if(old!=null && (!properties.simulatorEnabled() || !old.source().equals("SIMULATED")))continue;
                var point=geometry.at(route,path,phase+cycle*i/count);
                var vehicle=new Vehicle(id,route.id(),point.latitude(),point.longitude(),point.progressMeters(),
                    fleetPolicy.speedKmh(),properties.simulatorEnabled()?now:Instant.EPOCH,"SIMULATED",path);
                if(old==null)vehicles.insert(vehicle);else vehicles.update(vehicle);
            }
        }
        // RES/EX dispatches and real GPS vehicles are not repositioned or removed.
    }
}
