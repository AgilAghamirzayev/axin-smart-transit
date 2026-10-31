package az.transit.telemetry;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Synthetic service interval, not an official timetable. */
@Component
public class SimulationFleetPolicy {
    private final int headwaySeconds;
    private final double speedKmh;
    public SimulationFleetPolicy(@Value("${transit.simulation-headway-seconds:360}") int headwaySeconds,
            @Value("${transit.simulation-speed-kmh:23}") double speedKmh) {
        if(headwaySeconds<60 || headwaySeconds>3600 || !Double.isFinite(speedKmh) || speedKmh<5 || speedKmh>60)
            throw new IllegalArgumentException("Invalid simulation fleet settings");
        this.headwaySeconds=headwaySeconds;this.speedKmh=speedKmh;
    }
    public double speedKmh(){return speedKmh;}
    public int vehicleCount(double cycleMeters){
        return Math.max(2,(int)Math.ceil(cycleMeters/(speedKmh/3.6*headwaySeconds)));
    }
}
