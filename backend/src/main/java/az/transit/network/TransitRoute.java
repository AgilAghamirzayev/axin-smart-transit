package az.transit.network;
import java.util.ArrayList;
import java.util.List;
public record TransitRoute(String id, String name, String color, List<Stop> stops,
                           String number, String source, List<RoutePath> paths, List<StopMatch> stopMatches) {
    public TransitRoute {
        stops=List.copyOf(stops); paths=List.copyOf(paths); stopMatches=List.copyOf(stopMatches);
    }
    public TransitRoute(String id,String name,String color,List<Stop> stops) {
        this(id,name,color,stops,id,"DEMO",legacyPath(stops),List.of());
    }
    private static List<RoutePath> legacyPath(List<Stop> stops) {
        var points=new ArrayList<>(stops.stream().map(s->new Coordinate(s.latitude(),s.longitude())).toList());
        points.add(points.getFirst());
        return List.of(new RoutePath(points,true));
    }
}
