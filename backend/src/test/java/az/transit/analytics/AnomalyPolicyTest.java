package az.transit.analytics;
import java.time.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class AnomalyPolicyTest {
    private final AnomalyPolicy policy=new AnomalyPolicy();
    private final Instant start=Instant.parse("2026-10-31T08:00:00Z");
    private final Duration duration=Duration.ofMinutes(10),gap=Duration.ofMinutes(2);
    @Test void triggersAtExactlyTenMinutesNotBefore() {
        assertThat(policy.evaluate(true,start,start.plusSeconds(590),start.plusSeconds(599),duration,gap).alertRequired()).isFalse();
        assertThat(policy.evaluate(true,start,start.plusSeconds(599),start.plusSeconds(600),duration,gap).alertRequired()).isTrue();
    }
    @Test void nonHighAndMissingDataResetContinuity() {
        assertThat(policy.evaluate(false,start,start,start.plusSeconds(60),duration,gap).highSince()).isNull();
    }
    @Test void restartGapCannotGenerateFalseAlert() {
        var result=policy.evaluate(true,start,start.plusSeconds(60),start.plusSeconds(700),duration,gap);
        assertThat(result.highSince()).isEqualTo(start.plusSeconds(700));
        assertThat(result.alertRequired()).isFalse();
    }
    @Test void firstHighStartsAnEpisode() {
        var result=policy.evaluate(true,null,null,start,duration,gap);
        assertThat(result.highSince()).isEqualTo(start);
        assertThat(result.alertRequired()).isFalse();
    }
}
