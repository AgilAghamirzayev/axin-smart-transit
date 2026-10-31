package az.transit.network;
import java.util.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import az.transit.shared.ApiException;

/** Versioned catalogue loaded once after Flyway; GPS ticks never reload shapes. */
@Repository
@DependsOn("flywayInitializer")
public class NetworkRepository {
    public record Catalog(JsonNode metadata,List<TransitRoute> routes,List<Stop> stops) {}
    private final Catalog catalog;
    private final Map<String,TransitRoute> byId;
    private final Set<String> stopIds;
    public NetworkRepository(JdbcTemplate jdbc,ObjectMapper mapper,
            @Value("${transit.network-source:official}") String source) {
        if(source.equals("demo")) {
            var routes=jdbc.query("select * from transit_route where id like 'D%' order by id",(rs,i)-> {
                var stops=jdbc.query("""
                    select s.* from stop s join route_stop r on s.id=r.stop_id
                    where r.route_id=? order by r.sequence_no
                    """,(row,j)->new Stop(row.getString("id"),row.getString("name"),
                    row.getDouble("latitude"),row.getDouble("longitude")),rs.getString("id"));
                return new TransitRoute(rs.getString("id"),rs.getString("name"),rs.getString("color"),stops);
            });
            catalog=new Catalog(mapper.createObjectNode().put("version","demo"),routes,
                routes.stream().flatMap(r->r.stops().stream()).distinct().toList());
        } else if(source.equals("official")) {
            var stopMap=new LinkedHashMap<String,Stop>();
            jdbc.query("select definition from official_stop order by stop_id",(rs,i)->parse(mapper,rs.getString(1)))
                .forEach(node-> {
                    var stop=new Stop(node.get("id").asText(),node.get("name").asText(),
                        node.get("latitude").asDouble(),node.get("longitude").asDouble());
                    stopMap.put(stop.id(),stop);
                });
            var routes=jdbc.query("select definition from official_route order by route_id",(rs,i)-> {
                var node=parse(mapper,rs.getString(1));
                var paths=Arrays.asList(mapper.convertValue(node.get("paths"),RoutePath[].class));
                var matches=Arrays.asList(mapper.convertValue(node.get("stopMatches"),StopMatch[].class));
                var stops=matches.stream().map(m->stopMap.get(m.stopId())).distinct().toList();
                return new TransitRoute(node.get("id").asText(),node.get("name").asText(),node.get("color").asText(),
                    stops,node.get("number").asText(),"AYNA",paths,matches);
            });
            routes.sort(Comparator.comparingInt((TransitRoute r)->numericPrefix(r.number()))
                .thenComparing(TransitRoute::number).thenComparing(TransitRoute::id));
            catalog=new Catalog(jdbc.queryForObject("select definition from network_metadata where id=1",
                (rs,i)->parse(mapper,rs.getString(1))),List.copyOf(routes),List.copyOf(stopMap.values()));
        } else throw new IllegalArgumentException("network-source must be official or demo");
        var map=new LinkedHashMap<String,TransitRoute>();
        catalog.routes().forEach(r->map.put(r.id(),r));
        byId=Collections.unmodifiableMap(map);
        stopIds=catalog.stops().stream().map(Stop::id).collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
    private static int numericPrefix(String value) {
        var match=java.util.regex.Pattern.compile("^\\d+").matcher(value);
        return match.find()?Integer.parseInt(match.group()):Integer.MAX_VALUE;
    }
    private static JsonNode parse(ObjectMapper mapper,String value) {
        try { return mapper.readTree(value); }
        catch(Exception error) { throw new IllegalStateException("Corrupt network snapshot",error); }
    }
    public Catalog catalog() { return catalog; }
    public List<TransitRoute> routes() { return catalog.routes(); }
    public boolean containsRoute(String id) { return byId.containsKey(id); }
    public boolean containsStop(String id) { return stopIds.contains(id); }
    public TransitRoute route(String id) {
        var route=byId.get(id);
        if(route==null) throw ApiException.notFound("Marşrut tapılmadı");
        return route;
    }
    public List<Stop> stops(String routeId) { return route(routeId).stops(); }
}
