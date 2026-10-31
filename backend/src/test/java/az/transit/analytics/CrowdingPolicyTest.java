package az.transit.analytics;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import az.transit.crowding.*;
import static org.assertj.core.api.Assertions.*;

class CrowdingPolicyTest {
    private final CrowdingPolicy policy=new CrowdingPolicy();
    private CrowdReport report(String reporter,CrowdLevel level,int seconds) {
        return new CrowdReport(UUID.randomUUID().toString(),"D1-1","D1",reporter,level,Instant.EPOCH.plusSeconds(seconds));
    }
    @Test void noReportsMeansUnknownNotLow() {
        assertThat(policy.summarize(List.of(),3,.6).level()).isEqualTo(CrowdLevel.UNKNOWN);
    }
    @Test void duplicateVotersDoNotInflateHighCount() {
        assertThat(policy.summarize(List.of(report("a",CrowdLevel.HIGH,1),report("a",CrowdLevel.HIGH,2),
            report("a",CrowdLevel.HIGH,3)),3,.6).level()).isEqualTo(CrowdLevel.MEDIUM);
    }
    @Test void latestVoteWins() {
        var result=policy.summarize(List.of(report("a",CrowdLevel.HIGH,1),report("a",CrowdLevel.LOW,2)),1,.6);
        assertThat(result.level()).isEqualTo(CrowdLevel.LOW);
        assertThat(result.reporters()).isEqualTo(1);
    }
    @Test void threeIndependentHighVotesTriggerHigh() {
        assertThat(policy.summarize(List.of(report("a",CrowdLevel.HIGH,1),report("b",CrowdLevel.HIGH,1),
            report("c",CrowdLevel.HIGH,1)),3,.6).level()).isEqualTo(CrowdLevel.HIGH);
    }
    @Test void highRatioBoundaryIsInclusive() {
        var votes=List.of(report("a",CrowdLevel.HIGH,1),report("b",CrowdLevel.HIGH,1),
            report("c",CrowdLevel.HIGH,1),report("d",CrowdLevel.LOW,1),report("e",CrowdLevel.LOW,1));
        assertThat(policy.summarize(votes,3,.6).level()).isEqualTo(CrowdLevel.HIGH);
        assertThat(policy.summarize(votes,3,.61).level()).isNotEqualTo(CrowdLevel.HIGH);
    }
}
