package az.transit.dispatch;
import java.util.List;
import org.junit.jupiter.api.Test;
import az.transit.network.*;
import static org.assertj.core.api.Assertions.*;
class TrajectoryPolicyTest {
    final TrajectoryPolicy policy=new TrajectoryPolicy(new RouteGeometry());
    final RoutePath path=new RoutePath(List.of(new Coordinate(40,49),new Coordinate(40.001,49.001)),false);
    TransitRoute route(List<RoutePath> paths){return new TransitRoute("R","Line","#000",List.of(),"1","AYNA",paths,List.of());}
    @Test void completeLineHasActualEndpoints(){
        var result=policy.describe(route(List.of(path)));
        assertThat(result.assignable()).isTrue();assertThat(result.start().latitude()).isEqualTo(40);
        assertThat(result.end().latitude()).isEqualTo(40.001);assertThat(result.id()).isEqualTo("R:FULL");
    }
    @Test void disconnectedPartsCannotBeAssignedAsAFullRoute(){assertThat(policy.describe(route(List.of(path,path))).assignable()).isFalse();}
    @Test void largeGapCannotBeInventedAsRoad(){
        assertThat(policy.describe(route(List.of(new RoutePath(List.of(new Coordinate(40,49),new Coordinate(41,50)),false)))).assignable()).isFalse();
    }
}
