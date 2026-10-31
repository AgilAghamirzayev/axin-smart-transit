package az.transit;

import java.time.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import az.transit.analytics.*;
import az.transit.telemetry.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;

@SpringBootTest(properties={"spring.datasource.url=${TEST_DATABASE_URL:jdbc:h2:mem:test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",
    "transit.network-source=demo","transit.simulator-enabled=false","transit.analytics-initial-delay-ms=99999999"})
@AutoConfigureMockMvc
class TransitIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired VehicleRepository vehicles;
    @Autowired AnalyticsService analytics;
    @Autowired AnalyticsRepository alerts;
    @MockitoBean Clock clock;
    private final Instant start=Instant.parse("2026-10-31T08:00:00Z");
    @BeforeEach void setup() {
        when(clock.instant()).thenReturn(start);
        jdbc.update("delete from crowd_report");jdbc.update("delete from alert");
        jdbc.update("update route_state set high_since=null,last_evaluated=null");
        jdbc.update("update vehicle set observed_at=?,source='SIMULATED'",start.atOffset(ZoneOffset.UTC));
    }
    private String submission(String request,String reporter,String vehicle,String level) throws Exception {
        return json.writeValueAsString(Map.of("requestId",request,"reporterId",reporter,"vehicleId",vehicle,"level",level));
    }
    private void highVotes(int minute) throws Exception {
        var now=start.plusSeconds(minute*60L);when(clock.instant()).thenReturn(now);
        jdbc.update("update vehicle set observed_at=?",now.atOffset(ZoneOffset.UTC));
        for(int i=0;i<3;i++) mvc.perform(post("/api/reports").contentType("application/json")
            .content(submission(UUID.randomUUID().toString(),new UUID(0,i+1).toString(),"D1-1","HIGH")))
            .andExpect(status().isCreated());
    }
    @Test void routeAndStopFilteringEtaAndInvalidSelections() throws Exception {
        mvc.perform(get("/api/transit/snapshot").param("routeId","D1").param("stopId","s1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.vehicles.length()").value(3))
            .andExpect(jsonPath("$.vehicles[0].etaMinutes").isNumber());
        mvc.perform(get("/api/transit/snapshot").param("stopId","s7"))
            .andExpect(jsonPath("$.vehicles.length()").value(3))
            .andExpect(jsonPath("$.vehicles[0].routeId").value("D2"));
        mvc.perform(get("/api/transit/snapshot").param("routeId","missing")).andExpect(status().isNotFound());
        mvc.perform(get("/api/transit/snapshot").param("routeId","D1").param("stopId","s7")).andExpect(status().isBadRequest());
    }
    @Test void reportPersistenceIdempotencyCooldownAndValidation() throws Exception {
        String id=UUID.randomUUID().toString(),reporter=UUID.randomUUID().toString();
        String body=submission(id,reporter,"D1-1","LOW");
        mvc.perform(post("/api/reports").contentType("application/json").content(body)).andExpect(status().isCreated());
        mvc.perform(post("/api/reports").contentType("application/json").content(body)).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select count(*) from crowd_report",Integer.class)).isEqualTo(1);
        mvc.perform(post("/api/reports").contentType("application/json")
            .content(submission(UUID.randomUUID().toString(),reporter,"D1-1","HIGH"))).andExpect(status().isTooManyRequests());
        mvc.perform(post("/api/reports").contentType("application/json")
            .content(submission(id,UUID.randomUUID().toString(),"D1-1","LOW"))).andExpect(status().isConflict());
        mvc.perform(post("/api/reports").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/reports").contentType("application/json")
            .content(submission(UUID.randomUUID().toString(),UUID.randomUUID().toString(),"D1-1","UNKNOWN"))).andExpect(status().isBadRequest());
    }
    @Test void staleGpsSuppressesEtaReportsAndCrowdSignals() throws Exception {
        when(clock.instant()).thenReturn(start.plusSeconds(61));
        mvc.perform(get("/api/transit/snapshot").param("stopId","s1"))
            .andExpect(jsonPath("$.vehicles[0].stale").value(true))
            .andExpect(jsonPath("$.vehicles[0].etaMinutes").isEmpty());
        mvc.perform(post("/api/reports").contentType("application/json")
            .content(submission(UUID.randomUUID().toString(),UUID.randomUUID().toString(),"D1-1","HIGH")))
            .andExpect(status().isConflict());
        assertThat(analytics.snapshot().getFirst().activeVehicles()).isZero();
    }
    @Test void operatorAndGpsEndpointsEnforceSeparateRoles() throws Exception {
        mvc.perform(get("/api/operator/snapshot")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/operator/snapshot").with(httpBasic("operator","wrong"))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/operator/snapshot").with(httpBasic("operator","local-demo-change-me"))).andExpect(status().isOk());
        mvc.perform(get("/api/operator/snapshot").with(httpBasic("gps","local-gps-change-me"))).andExpect(status().isForbidden());
    }
    @Test void gpsValidationAndOutOfOrderProtection() throws Exception {
        var v=vehicles.get("D1-1");
        String body=json.writeValueAsString(Map.of("latitude",v.latitude(),"longitude",v.longitude(),"speedKmh",25,"observedAt",start.plusSeconds(1).toString()));
        mvc.perform(put("/api/telemetry/vehicles/D1-1").contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/telemetry/vehicles/D1-1").with(httpBasic("gps","local-gps-change-me")).contentType("application/json").content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.source").value("GPS"));
        mvc.perform(put("/api/telemetry/vehicles/D1-1").with(httpBasic("gps","local-gps-change-me")).contentType("application/json").content(body)).andExpect(status().isConflict());
        mvc.perform(put("/api/telemetry/vehicles/D1-1").with(httpBasic("gps","local-gps-change-me")).contentType("application/json")
            .content(json.writeValueAsString(Map.of("latitude",0,"longitude",0,"speedKmh",25,"observedAt",start.toString())))).andExpect(status().isBadRequest());
    }
    @Test void tenMinuteEpisodeCreatesOneRecommendationThenResolvesAndCanRecur() throws Exception {
        for(int minute=0;minute<10;minute++) { highVotes(minute);analytics.evaluate(); }
        assertThat(alerts.alerts()).isEmpty();
        highVotes(10);analytics.evaluate();analytics.evaluate();
        assertThat(alerts.alerts()).hasSize(1);
        var alert=alerts.alerts().getFirst();
        assertThat(alert.resolvedAt()).isNull();
        mvc.perform(post("/api/operator/alerts/"+alert.id()+"/acknowledge").with(httpBasic("operator","local-demo-change-me")))
            .andExpect(status().isOk());
        assertThat(alerts.alerts().getFirst().acknowledgedAt()).isNotNull();
        when(clock.instant()).thenReturn(start.plusSeconds(721));analytics.evaluate();
        assertThat(alerts.alerts().getFirst().resolvedAt()).isNotNull();
        for(int minute=13;minute<=23;minute++) { highVotes(minute);analytics.evaluate(); }
        assertThat(alerts.alerts()).hasSize(2);
    }
    @Test void expiredReportsResetHighEvenWithFreshGps() throws Exception {
        highVotes(0);analytics.evaluate();
        when(clock.instant()).thenReturn(start.plusSeconds(121));
        jdbc.update("update vehicle set observed_at=?",start.plusSeconds(121).atOffset(ZoneOffset.UTC));
        analytics.evaluate();
        assertThat(alerts.state("D1").highSince()).isNull();
    }
    @Test void idempotentReplayPreservesTimestampPrecision() throws Exception {
        when(clock.instant()).thenReturn(start.plusNanos(123456789));
        String body=submission(UUID.randomUUID().toString(),UUID.randomUUID().toString(),"D1-1","LOW");
        String first=mvc.perform(post("/api/reports").contentType("application/json").content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String replay=mvc.perform(post("/api/reports").contentType("application/json").content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(replay)).isEqualTo(json.readTree(first));
    }
}
