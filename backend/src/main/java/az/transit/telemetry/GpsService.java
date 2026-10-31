package az.transit.telemetry;

import java.time.Clock;
import java.time.Instant;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import az.transit.network.*;
import az.transit.shared.*;

@Service
public class GpsService {
    public record GpsUpdate(@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotNull @DecimalMin("0") @DecimalMax("120") Double speedKmh, @NotNull Instant observedAt) {}
    private final VehicleRepository vehicles;
    private final NetworkRepository network;
    private final RouteGeometry geometry;
    private final Clock clock;
    public GpsService(VehicleRepository vehicles, NetworkRepository network, RouteGeometry geometry, Clock clock) {
        this.vehicles=vehicles;this.network=network;this.geometry=geometry;this.clock=clock;
    }
    @Transactional
    public Vehicle accept(String vehicleId, GpsUpdate input) {
        var old=vehicles.get(vehicleId);
        if(input.observedAt().isAfter(clock.instant().plusSeconds(5)) ||
           input.observedAt().isBefore(clock.instant().minusSeconds(60)))
            throw new ApiException(HttpStatus.BAD_REQUEST,"GPS vaxtı son 60 saniyədə olmalıdır");
        var position=geometry.project(network.route(old.routeId()),old.pathIndex(),input.latitude(),input.longitude());
        if(position.distanceFromRoute()>300) throw new ApiException(HttpStatus.BAD_REQUEST,"GPS marşrutdan 300 metrdən çox uzaqdır");
        var updated=new Vehicle(old.id(),old.routeId(),input.latitude(),input.longitude(),
            position.progressMeters(),input.speedKmh(),input.observedAt(),"GPS",old.pathIndex());
        if(!vehicles.update(updated)) throw new ApiException(HttpStatus.CONFLICT,"Köhnə GPS ölçümü qəbul edilmir");
        return vehicles.get(vehicleId);
    }
}
