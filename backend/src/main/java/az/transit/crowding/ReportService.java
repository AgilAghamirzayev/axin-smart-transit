package az.transit.crowding;
import java.time.Clock;
import java.util.UUID;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import az.transit.telemetry.VehicleRepository;
import az.transit.shared.*;

@Service
public class ReportService {
    public record Submission(@NotNull UUID requestId,@NotNull UUID reporterId,
                             @NotNull String vehicleId,@NotNull CrowdLevel level) {}
    private final ReportRepository reports;
    private final VehicleRepository vehicles;
    private final TransitProperties properties;
    private final Clock clock;
    public ReportService(ReportRepository reports,VehicleRepository vehicles,TransitProperties properties,Clock clock) {
        this.reports=reports;this.vehicles=vehicles;this.properties=properties;this.clock=clock;
    }
    // The DB transaction lock makes idempotent retries and cooldown checks atomic.
    @Transactional
    public CrowdReport submit(Submission input) {
        reports.lockWrites();
        if(input.level()==CrowdLevel.UNKNOWN) throw new ApiException(HttpStatus.BAD_REQUEST,"Sıxlıq seçin");
        var existing=reports.find(input.requestId().toString());
        if(existing.isPresent()) {
            var report=existing.get();
            if(!report.reporterId().equals(input.reporterId().toString()) ||
                !report.vehicleId().equals(input.vehicleId()) || report.level()!=input.level())
                throw new ApiException(HttpStatus.CONFLICT,"Sorğu identifikatoru artıq istifadə edilib");
            return report;
        }
        var vehicle=vehicles.get(input.vehicleId());
        var now=clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        if(vehicle.observedAt().isBefore(now.minus(properties.gpsFreshness())))
            throw new ApiException(HttpStatus.CONFLICT,"Avtobusun GPS məlumatı köhnədir");
        if(reports.lastByReporter(input.reporterId().toString())
            .filter(last->last.plus(properties.reportCooldown()).isAfter(now)).isPresent())
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"Yeni bildiriş üçün " + properties.reportCooldown().toSeconds() + " saniyə gözləyin");
        var report=new CrowdReport(input.requestId().toString(),vehicle.id(),vehicle.routeId(),
            input.reporterId().toString(),input.level(),now);
        reports.save(report);
        return report;
    }
}
