package az.transit.network;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import az.transit.telemetry.VehicleRepository;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${TEST_DATABASE_URL:jdbc:h2:mem:official;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",
    "transit.network-source=official","transit.simulator-enabled=false","transit.analytics-initial-delay-ms=99999999"})
@AutoConfigureMockMvc
class OfficialNetworkIntegrationTest {
    @Autowired NetworkRepository network;
    @Autowired RouteGeometry geometry;
    @Autowired VehicleRepository vehicles;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Test void importsFullCatalogueAndPreservesDuplicateRouteNumbers() {
        assertThat(network.routes()).hasSize(243);
        assertThat(network.routes().stream().map(TransitRoute::number).distinct().count()).isEqualTo(239);
        assertThat(network.routes().stream().map(TransitRoute::id).distinct().count()).isEqualTo(243);
        assertThat(network.catalog().stops()).hasSize(3600);
        assertThat(network.routes().stream().flatMap(r->r.paths().stream()).count()).isEqualTo(270);
        assertThat(network.routes()).noneMatch(r->r.id().startsWith("D"));
        assertThat(jdbc.queryForObject("select count(*) from transit_route where id='D1'",Integer.class)).isEqualTo(1);
    }
    @Test void inferredMatchesReferenceExistingStopsAndValidPathOffsets() {
        var ids=network.catalog().stops().stream().map(Stop::id).collect(java.util.stream.Collectors.toSet());
        for(var route:network.routes()) for(var match:route.stopMatches()) {
            assertThat(ids).contains(match.stopId());
            assertThat(match.distanceMeters()).isBetween(0d,35d);
            assertThat(match.progressMeters()).isBetween(0d,geometry.length(route,match.pathIndex())+.01);
        }
    }
    @Test void seededFleetUsesEveryIndependentPath() {
        var official=vehicles.all().stream().filter(v->network.containsRoute(v.routeId())).toList();
        assertThat(official).hasSize(540);
        for(var v:official) {
            assertThat(v.pathIndex()).isLessThan(network.route(v.routeId()).paths().size());
            var p=geometry.at(network.route(v.routeId()),v.pathIndex(),v.progressMeters());
            assertThat(v.latitude()).isCloseTo(p.latitude(),within(1e-7));
            assertThat(v.longitude()).isCloseTo(p.longitude(),within(1e-7));
        }
    }
    @Test void networkAndLiveSnapshotsAreSeparatedAndEtaUsesOfficialShape() throws Exception {
        var route=network.routes().stream().filter(r->r.number().equals("5")).findFirst().orElseThrow();
        var stop=route.stops().getFirst();
        jdbc.update("update vehicle set observed_at=?",Instant.now().atOffset(ZoneOffset.UTC));
        mvc.perform(get("/api/transit/network")).andExpect(status().isOk())
            .andExpect(jsonPath("$.metadata.routeCount").value(243))
            .andExpect(jsonPath("$.stops.length()").value(3600));
        mvc.perform(get("/api/transit/snapshot").param("routeId",route.id()).param("stopId",stop.id()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.routes").doesNotExist())
            .andExpect(jsonPath("$.vehicles.length()").value(2))
            .andExpect(jsonPath("$.vehicles[0].etaMinutes").isNumber())
            .andExpect(jsonPath("$.vehicles[0].pathIndex").value(0));
    }
    @Test void unmatchedOfficialStopIsSearchableWithoutInventedService() throws Exception {
        var matched=network.routes().stream().flatMap(r->r.stopMatches().stream()).map(StopMatch::stopId)
            .collect(java.util.stream.Collectors.toSet());
        var unmatched=network.catalog().stops().stream().filter(s->!matched.contains(s.id())).findFirst().orElseThrow();
        mvc.perform(get("/api/transit/snapshot").param("stopId",unmatched.id()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.vehicles.length()").value(0));
    }
}
