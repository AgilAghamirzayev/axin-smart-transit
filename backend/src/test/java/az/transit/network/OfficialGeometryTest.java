package az.transit.network;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class OfficialGeometryTest {
    private final RouteGeometry geometry=new RouteGeometry();
    private final Stop stop=new Stop("s","Stop",40.38,49.845);
    private final RoutePath open=new RoutePath(List.of(new Coordinate(40.38,49.84),new Coordinate(40.38,49.85)),false);
    private TransitRoute route() {
        double middle=geometry.distance(40.38,49.84,40.38,49.845);
        return new TransitRoute("r","Route","#fff",List.of(stop),"5","AYNA",
            List.of(open,new RoutePath(List.of(new Coordinate(40.5,49.9),new Coordinate(40.5,49.91)),false)),
            List.of(new StopMatch("s",0,middle,0)));
    }
    @Test void openPathTurnsBackWithoutArtificialClosingChord() {
        var route=route(); double length=geometry.length(route);
        var before=geometry.at(route,0,length-100);
        var after=geometry.at(route,0,length+100);
        assertThat(after.latitude()).isCloseTo(before.latitude(),within(1e-8));
        assertThat(after.longitude()).isCloseTo(before.longitude(),within(1e-8));
    }
    @Test void disconnectedPartsStayDisconnected() {
        var route=route();
        var second=geometry.at(route,1,100);
        assertThat(second.latitude()).isCloseTo(40.5,within(1e-7));
        assertThat(geometry.etaMinutes(route,1,0,20,"s",true)).isNull();
    }
    @Test void reverseSimulationEtaUsesNextPassInsteadOfAFullLoop() {
        var route=route();double length=geometry.length(route);
        int forward=geometry.etaMinutes(route,0,0,20,"s",true);
        int reverse=geometry.etaMinutes(route,0,length,20,"s",true);
        assertThat(reverse).isEqualTo(forward);
    }
    @Test void realGpsDoesNotPromiseSimulatedReturnForPassedStop() {
        var route=route();
        assertThat(geometry.etaMinutes(route,0,geometry.length(route)*.9,20,"s",false)).isNull();
        assertThat(geometry.etaMinutes(route,0,geometry.length(route)*.9,20,"s",true)).isPositive();
    }
}
