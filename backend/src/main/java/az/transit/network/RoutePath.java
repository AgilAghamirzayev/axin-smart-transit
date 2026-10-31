package az.transit.network;
import java.util.List;
public record RoutePath(List<Coordinate> points, boolean closed) {
    public RoutePath { points = List.copyOf(points); }
}
