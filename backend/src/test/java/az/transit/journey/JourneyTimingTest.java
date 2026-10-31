package az.transit.journey;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import az.transit.crowding.CrowdLevel;
class JourneyTimingTest {
    @Test void waitsAndRidesSeparately() {
        var timing=JourneyTiming.ride(0,10,1000,true,List.of(100.0),List.of(300.0),0);
        assertThat(timing.boardSeconds()).isEqualTo(10);assertThat(timing.alightSeconds()).isEqualTo(30);
    }
    @Test void walkingPastTheBusArrivalRequiresNextPass() {
        var timing=JourneyTiming.ride(0,10,1000,true,List.of(100.0),List.of(300.0),11);
        assertThat(timing.boardSeconds()).isEqualTo(110);assertThat(timing.alightSeconds()).isEqualTo(130);
    }
    @Test void realOpenPathNeverInventsAReturnTrip() {
        assertThat(JourneyTiming.ride(200,10,1000,false,List.of(100.0),List.of(300.0),0)).isNull();
        assertThat(JourneyTiming.ride(0,10,1000,false,List.of(300.0),List.of(100.0),0)).isNull();
    }
    @Test void openSimulationUsesReversePhaseWithoutShortcut() {
        var timing=JourneyTiming.ride(550,10,1000,true,List.of(200.0,800.0),List.of(100.0,900.0),0);
        assertThat(timing.boardSeconds()).isEqualTo(25);assertThat(timing.alightSeconds()).isEqualTo(35);
        assertThat(timing.boardProgress()).isEqualTo(800);assertThat(timing.alightProgress()).isEqualTo(900);
    }
    @Test void crowdPreferencesChangeRankingButNotPhysicalTime() {
        assertThat(JourneyService.penalty(CrowdLevel.HIGH,JourneyService.Preference.FASTEST)).isZero();
        assertThat(JourneyService.penalty(CrowdLevel.HIGH,JourneyService.Preference.COMFORT)).isEqualTo(1200);
        assertThat(600+JourneyService.penalty(CrowdLevel.HIGH,JourneyService.Preference.BALANCED))
            .isGreaterThan(900+JourneyService.penalty(CrowdLevel.LOW,JourneyService.Preference.BALANCED));
    }
    @Test void repeatedStopUsesCorrectDirectionInsteadOfEarlierDetour() {
        var timing=JourneyTiming.ride(0,10,40000,true,List.of(13089.79,24670.604),List.of(6860.818,30026.006),0);
        assertThat(timing.boardProgress()).isEqualTo(24670.604);
        assertThat(timing.alightProgress()).isEqualTo(30026.006);
        assertThat(timing.alightSeconds()-timing.boardSeconds()).isCloseTo(535.5402,within(0.001));
    }
    @Test void shuttleDoesNotCarryPassengerPastTerminalToReverse() {
        assertThat(JourneyTiming.ride(0,10,1000,true,true,List.of(400.0),List.of(800.0),0)).isNull();
        var timing=JourneyTiming.ride(0,10,1000,true,true,List.of(400.0,600.0),List.of(200.0,800.0),0);
        assertThat(timing.boardProgress()).isEqualTo(600);
        assertThat(timing.alightProgress()).isEqualTo(800);
    }
    @Test void shuttleCanAlightAtReturnTerminal() {
        var timing=JourneyTiming.ride(600,10,1000,true,true,List.of(800.0),List.of(0.0,1000.0),0);
        assertThat(timing.alightProgress()).isEqualTo(1000);
    }
}
