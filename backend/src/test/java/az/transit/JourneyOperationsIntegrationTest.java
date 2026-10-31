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
import az.transit.telemetry.*;
import az.transit.network.*;
import az.transit.analytics.AnalyticsService;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;

@SpringBootTest(properties={"spring.datasource.url=${TEST_DATABASE_URL:jdbc:h2:mem:operations;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",
    "transit.simulator-enabled=true","transit.nominal-capacity=4","transit.analytics-initial-delay-ms=99999999"})
@AutoConfigureMockMvc
class JourneyOperationsIntegrationTest {
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate jdbc;
    @Autowired VehicleRepository vehicles;@Autowired NetworkRepository network;@Autowired AnalyticsService analytics;
    @MockitoBean Clock clock;@MockitoBean GpsSimulator simulator;
    final Instant start=Instant.parse("2026-10-31T10:00:00Z");
    final String vehicleId="AYNA-00010-P1-1";
    @BeforeEach void reset(){
        when(clock.instant()).thenReturn(start);
        jdbc.update("update reserve_bus set status='READY'");
        jdbc.update("delete from presence_session");jdbc.update("delete from dispatch_order");jdbc.update("delete from crowd_report");jdbc.update("delete from alert");
        jdbc.update("delete from vehicle where id like 'EX-%' or id like 'RES-%'");jdbc.update("update route_state set high_since=null,last_evaluated=null");
        jdbc.update("update vehicle set observed_at=?",start.atOffset(ZoneOffset.UTC));
    }
    String body(Object data)throws Exception{return json.writeValueAsString(data);}
    @AfterEach void cleanup(){
        jdbc.update("update reserve_bus set status='READY'");
        jdbc.update("delete from presence_session");jdbc.update("delete from dispatch_order");
        jdbc.update("delete from crowd_report where vehicle_id like 'EX-%' or vehicle_id like 'RES-%'");jdbc.update("delete from vehicle where id like 'EX-%' or id like 'RES-%'");
    }
    String session(String reporter)throws Exception {
        var response=mvc.perform(post("/api/presence").contentType("application/json").content(body(Map.of("reporterId",reporter,"vehicleId",vehicleId,"consent",true)))).andExpect(status().isOk()).andReturn();
        return json.readTree(response.getResponse().getContentAsString()).get("sessionId").asText();
    }
    String fix(int second,double accuracy,boolean nearby)throws Exception {
        var v=vehicles.get(vehicleId);
        return body(Map.of("latitude",v.latitude()+(nearby?0:1),"longitude",v.longitude(),"accuracy",accuracy,"observedAt",start.plusSeconds(second)));
    }
    @Test void consentContinuousProximityReplayAndLeave()throws Exception {
        mvc.perform(post("/api/presence").contentType("application/json").content(body(Map.of("reporterId",UUID.randomUUID(),"vehicleId",vehicleId,"consent",false)))).andExpect(status().isBadRequest());
        String reporter=UUID.randomUUID().toString(),id=session(reporter);
        for(int second:new int[]{0,8,16}){
            when(clock.instant()).thenReturn(start.plusSeconds(second));
            mvc.perform(post("/api/presence/"+id+"/sample").contentType("application/json").content(fix(second,10,true))).andExpect(status().isOk()).andExpect(jsonPath("$.verified").value(second==16));
        }
        mvc.perform(post("/api/presence/"+id+"/sample").contentType("application/json").content(fix(16,10,true))).andExpect(status().isConflict());
        mvc.perform(get("/api/transit/snapshot").param("routeId","AYNA-00010")).andExpect(jsonPath("$.vehicles[0].gpsParticipants").value(1));
        session(reporter);assertThat(jdbc.queryForObject("select count(*) from presence_session",Integer.class)).isEqualTo(1);
        mvc.perform(post("/api/presence/"+id+"/sample").contentType("application/json").content(fix(17,10,true))).andExpect(status().isNotFound());
    }
    @Test void poorAccuracyDistanceAndExpiryCannotClaimPassengers()throws Exception {
        var id=session(UUID.randomUUID().toString());
        mvc.perform(post("/api/presence/"+id+"/sample").contentType("application/json").content(fix(0,100,true))).andExpect(jsonPath("$.verified").value(false));
        when(clock.instant()).thenReturn(start.plusSeconds(16));
        mvc.perform(post("/api/presence/"+id+"/sample").contentType("application/json").content(fix(16,5,false))).andExpect(jsonPath("$.samples").value(0));
        when(clock.instant()).thenReturn(start.plusSeconds(140));
        mvc.perform(post("/api/presence/"+id+"/sample").contentType("application/json").content(fix(140,5,true))).andExpect(status().isGone());
        mvc.perform(post("/api/presence/"+id+"/end")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from presence_session",Integer.class)).isZero();
    }
    @Test void gpsSamplesDriveRouteLevelAndExpire()throws Exception {
        for(int i=0;i<4;i++) {
            when(clock.instant()).thenReturn(start);var id=session(UUID.randomUUID().toString());
            for(int second:new int[]{0,8,16}){
                when(clock.instant()).thenReturn(start.plusSeconds(second));
                mvc.perform(post("/api/presence/"+id+"/sample").contentType("application/json").content(fix(second,5,true))).andExpect(status().isOk());
            }
        }
        var route=analytics.snapshot().stream().filter(r->r.routeId().equals("AYNA-00010")).findFirst().orElseThrow();
        assertThat(route.gpsParticipants()).isEqualTo(4);assertThat(route.level().name()).isEqualTo("HIGH");
        when(clock.instant()).thenReturn(start.plusSeconds(80));
        assertThat(analytics.snapshot().stream().filter(r->r.routeId().equals("AYNA-00010")).findFirst().orElseThrow().gpsParticipants()).isZero();
    }
    @Test void authorizedDispatchIsPersistentIdempotentAndRateLimited()throws Exception {
        String id=UUID.randomUUID().toString();String request=body(Map.of("requestId",id,"routeId","AYNA-00010","trajectoryId","AYNA-00010:FULL","reserveVehicleId","RES-AYNA-00010-1"));
        mvc.perform(post("/api/operator/dispatches").contentType("application/json").content(request)).andExpect(status().isUnauthorized());
        for(int i=0;i<2;i++)mvc.perform(post("/api/operator/dispatches").with(httpBasic("operator","local-demo-change-me")).contentType("application/json").content(request)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from dispatch_order",Integer.class)).isEqualTo(1);
        assertThat(vehicles.get("RES-AYNA-00010-1").progressMeters()).isZero();
        assertThat(jdbc.queryForObject("select status from reserve_bus where id='RES-AYNA-00010-1'",String.class)).isEqualTo("ASSIGNED");
        assertThat(vehicles.all().stream().filter(v->v.routeId().equals("AYNA-00010")).count()).isEqualTo(3);
        mvc.perform(post("/api/operator/dispatches").with(httpBasic("operator","local-demo-change-me")).contentType("application/json").content(body(Map.of("requestId",UUID.randomUUID(),"routeId","AYNA-00010","trajectoryId","AYNA-00010:FULL","reserveVehicleId","RES-AYNA-00010-1")))).andExpect(status().isTooManyRequests());
        mvc.perform(get("/api/operator/dispatches").with(httpBasic("gps","local-gps-change-me"))).andExpect(status().isForbidden());
    }
    @Test void assignmentRejectsIncompatibleBusTrajectoryAndMissingSelection()throws Exception {
        mvc.perform(get("/api/operator/dispatches/options").param("routeId","AYNA-00010")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/operator/dispatches/options").param("routeId","AYNA-00010").with(httpBasic("operator","local-demo-change-me")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.trajectory.assignable").value(true)).andExpect(jsonPath("$.buses.length()").value(3));
        for(var pair:List.of(List.of("AYNA-00010:FULL","RES-AYNA-00001-1"),List.of("AYNA-00001:FULL","RES-AYNA-00010-1"))) {
            mvc.perform(post("/api/operator/dispatches").with(httpBasic("operator","local-demo-change-me")).contentType("application/json")
                .content(body(Map.of("requestId",UUID.randomUUID(),"routeId","AYNA-00010","trajectoryId",pair.get(0),"reserveVehicleId",pair.get(1)))))
                .andExpect(status().is4xxClientError());
        }
        mvc.perform(post("/api/operator/dispatches").with(httpBasic("operator","local-demo-change-me")).contentType("application/json")
            .content(body(Map.of("requestId",UUID.randomUUID(),"routeId","AYNA-00010","pathIndex",0))))
            .andExpect(status().isBadRequest());
        var fragmented=network.routes().stream().filter(r->r.paths().size()>1).findFirst().orElseThrow();
        mvc.perform(post("/api/operator/dispatches").with(httpBasic("operator","local-demo-change-me")).contentType("application/json")
            .content(body(Map.of("requestId",UUID.randomUUID(),"routeId",fragmented.id(),"trajectoryId",fragmented.id()+":FULL","reserveVehicleId","RES-"+fragmented.id()+"-1"))))
            .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from dispatch_order",Integer.class)).isZero();
    }
    @Test void journeyReturnsChronologicalCrowdAwareAlternativesAndEmptyOutsideNetwork()throws Exception {
        var route=network.route("AYNA-00010");var from=route.stops().get(0);var to=route.stops().get(route.stops().size()/2);
        var request=Map.of("fromLatitude",from.latitude(),"fromLongitude",from.longitude(),"toLatitude",to.latitude(),"toLongitude",to.longitude(),"preference","ECONOMY","fromStopId",from.id(),"toStopId",to.id());
        var response=mvc.perform(post("/api/journeys/plan").contentType("application/json").content(body(request))).andExpect(status().isOk()).andReturn();
        var plan=json.readTree(response.getResponse().getContentAsString());assertThat(plan.get("options").size()).isGreaterThan(0);
        for(var option:plan.get("options")){
            assertThat(option.get("legs").size()).isBetween(1,2);
            assertThat(option.get("legs").get(0).get("from").get("id").asText()).isEqualTo(from.id());
            assertThat(option.get("walkingSeconds").asLong()).isLessThanOrEqualTo(1050);
            assertThat(Instant.parse(option.get("arriveAt").asText())).isAfter(start);
            for(var leg:option.get("legs")) {
                assertThat(Instant.parse(leg.get("alightAt").asText())).isAfter(Instant.parse(leg.get("boardAt").asText()));
                assertThat(leg.get("alightProgress").asDouble()).isGreaterThan(leg.get("boardProgress").asDouble());
            }
        }
        for(int i=1;i<plan.get("options").size();i++)assertThat(plan.get("options").get(i).get("legs").size())
            .isGreaterThanOrEqualTo(plan.get("options").get(i-1).get("legs").size());
        mvc.perform(post("/api/journeys/plan").contentType("application/json").content(body(Map.of("fromLatitude",0,"fromLongitude",0,"toLatitude",0,"toLongitude",1,"preference","FASTEST")))).andExpect(status().isOk()).andExpect(jsonPath("$.options.length()").value(0));
    }
}
