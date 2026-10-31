package az.transit.presence;
import org.junit.jupiter.api.Test;
import az.transit.crowding.CrowdLevel;
import static org.assertj.core.api.Assertions.*;
class OccupancyPolicyTest {
    private final OccupancyPolicy policy=new OccupancyPolicy(60);
    @Test void smallSampleNeverProvesLowOccupancy() {
        assertThat(policy.level(0)).isEqualTo(CrowdLevel.UNKNOWN);
        assertThat(policy.level(29)).isEqualTo(CrowdLevel.UNKNOWN);
    }
    @Test void thresholdsAndReportsCombineConservatively() {
        assertThat(policy.level(30)).isEqualTo(CrowdLevel.MEDIUM);
        assertThat(policy.level(47)).isEqualTo(CrowdLevel.MEDIUM);
        assertThat(policy.level(48)).isEqualTo(CrowdLevel.HIGH);
        assertThat(policy.combine(CrowdLevel.LOW,48)).isEqualTo(CrowdLevel.HIGH);
        assertThat(policy.combine(CrowdLevel.HIGH,0)).isEqualTo(CrowdLevel.HIGH);
    }
}
