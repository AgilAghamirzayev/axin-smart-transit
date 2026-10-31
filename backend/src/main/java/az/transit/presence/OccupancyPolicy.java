package az.transit.presence;

import az.transit.crowding.CrowdLevel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OccupancyPolicy {
    private final int capacity;
    public OccupancyPolicy(@Value("${transit.nominal-capacity:60}") int capacity) {
        if(capacity<1) throw new IllegalArgumentException("Capacity must be positive");
        this.capacity=capacity;
    }
    public int capacity() { return capacity; }
    public CrowdLevel level(int participants) {
        // A small opt-in sample cannot establish that a bus is empty.
        return participants>=Math.ceil(capacity*.8)?CrowdLevel.HIGH:
            participants>=Math.ceil(capacity*.5)?CrowdLevel.MEDIUM:CrowdLevel.UNKNOWN;
    }
    public CrowdLevel combine(CrowdLevel reported,int participants) {
        var gps=level(participants);
        if(gps==CrowdLevel.HIGH || reported==CrowdLevel.HIGH) return CrowdLevel.HIGH;
        if(gps==CrowdLevel.MEDIUM || reported==CrowdLevel.MEDIUM) return CrowdLevel.MEDIUM;
        return reported;
    }
}
