package az.transit.shared;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.*;

@Validated
@ConfigurationProperties("transit")
public record TransitProperties(boolean simulatorEnabled, @NotBlank String operatorPassword,
        @NotBlank String telemetryPassword, @NotNull Duration gpsFreshness,
        @NotNull Duration reportFreshness, @NotNull Duration highDuration,
        @Min(1) int minReporters, @DecimalMin("0.5") @DecimalMax("1.0") double highRatio,
        @NotNull Duration reportCooldown) {
    public TransitProperties {
        for (Duration duration : new Duration[]{gpsFreshness, reportFreshness, highDuration, reportCooldown}) {
            if (duration != null && (duration.isZero() || duration.isNegative()))
                throw new IllegalArgumentException("Durations must be positive");
        }
    }
}
