package az.transit.presence;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.http.HttpStatus;
import az.transit.network.*;
import az.transit.telemetry.VehicleRepository;
import az.transit.shared.ApiException;

@Service
public class PresenceService {
    public record Result(boolean verified,int samples,String message) {}
    private final PresenceRepository repository;
    private final VehicleRepository vehicles;
    private final RouteGeometry geometry;
    private final NetworkRepository network;
    private final Clock clock;
    public PresenceService(PresenceRepository repository,VehicleRepository vehicles,RouteGeometry geometry,NetworkRepository network,Clock clock) {
        this.repository=repository;this.vehicles=vehicles;this.geometry=geometry;this.network=network;this.clock=clock;
    }
    @Transactional public String start(String reporter,String vehicleId) {
        var vehicle=vehicles.get(vehicleId);network.route(vehicle.routeId());
        repository.lock();
        String id=UUID.randomUUID().toString();
        repository.replace(id,reporter,vehicleId,clock.instant());return id;
    }
    @Transactional public Result sample(String id,double lat,double lon,double accuracy,Instant observed) {
        var now=clock.instant();var session=repository.get(id);
        if(session.lastSeen().isBefore(now.minusSeconds(120))) throw new ApiException(HttpStatus.GONE,"Məkan sessiyası bitib; yenidən başlayın");
        if(observed.isBefore(now.minusSeconds(15)) || observed.isAfter(now.plusSeconds(5)))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Aktual GPS ölçməsi tələb olunur");
        if(session.lastObserved()!=null && !observed.isAfter(session.lastObserved()))
            throw new ApiException(HttpStatus.CONFLICT,"GPS ölçməsi təkrarlanıb və ya köhnədir");
        var vehicle=vehicles.get(session.vehicleId());
        boolean nearby=accuracy<=35 && !vehicle.observedAt().isBefore(now.minusSeconds(60)) &&
            geometry.distance(lat,lon,vehicle.latitude(),vehicle.longitude())<=75;
        boolean continuous=session.firstSeen()!=null && session.lastSeen().isAfter(now.minusSeconds(20));
        var first=nearby?(continuous?session.firstSeen():now):null;
        int fixes=nearby?(continuous?session.fixes()+1:1):0;
        boolean verified=nearby && fixes>=3 && Duration.between(first,now).toSeconds()>=15;
        repository.save(new PresenceRepository.Session(id,session.vehicleId(),first,now,observed,fixes,verified));
        return new Result(verified,fixes,verified?"GPS yaxınlığı ilə təsdiqləndi":nearby?"Davamlı yaxınlıq yoxlanılır":"GPS dəqiqliyi/yaxınlığı yetərli deyil");
    }
    @Transactional public void end(String id) { repository.end(id); }
    public Map<String,Integer> counts() { return repository.counts(clock.instant().minusSeconds(60)); }
    @Scheduled(fixedDelay=60000,initialDelay=60000) public void purge() { repository.purge(clock.instant().minusSeconds(600)); }
}
