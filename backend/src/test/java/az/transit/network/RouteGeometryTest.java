package az.transit.network;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class RouteGeometryTest {
    private final RouteGeometry geometry=new RouteGeometry();
    private final TransitRoute route=new TransitRoute("D1","Test","#000",
        List.of(new Stop("a","A",40.38,49.84),new Stop("b","B",40.38,49.85),new Stop("c","C",40.39,49.85)));
    @Test void loopWrapsWithoutTeleportingPastEndpoint() {
        var start=geometry.at(route,0);
        var loop=geometry.at(route,geometry.length(route));
        assertThat(loop.latitude()).isCloseTo(start.latitude(),within(.000001));
        assertThat(loop.longitude()).isCloseTo(start.longitude(),within(.000001));
    }
    @Test void passedStopIsNextLapNotNegativeEta() {
        assertThat(geometry.etaMinutes(route,100,20,"a")).isGreaterThan(1);
        assertThat(geometry.etaMinutes(route,0,20,"a")).isZero();
    }
    @Test void projectionFindsAlongRouteDistance() {
        var point=geometry.at(route,250);
        var projected=geometry.project(route,point.latitude(),point.longitude());
        assertThat(projected.progressMeters()).isCloseTo(250,within(1d));
        assertThat(projected.distanceFromRoute()).isLessThan(1);
    }
    @Test void stoppedVehicleUsesPlanningSpeedAndMissingStopFails() {
        assertThat(geometry.etaMinutes(route,0,0,"b")).isEqualTo(geometry.etaMinutes(route,0,18,"b"));
        assertThatThrownBy(()->geometry.etaMinutes(route,0,20,"missing")).hasMessageContaining("Dayanacaq");
    }
}
