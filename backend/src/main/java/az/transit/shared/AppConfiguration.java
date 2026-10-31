package az.transit.shared;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class AppConfiguration {
    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean InMemoryUserDetailsManager users(TransitProperties properties) {
        var encoder = new BCryptPasswordEncoder();
        return new InMemoryUserDetailsManager(
            User.withUsername("operator").password("{bcrypt}" + encoder.encode(properties.operatorPassword())).roles("OPERATOR").build(),
            User.withUsername("gps").password("{bcrypt}" + encoder.encode(properties.telemetryPassword())).roles("GPS").build());
    }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/operator/**").hasRole("OPERATOR")
                .requestMatchers("/api/telemetry/**").hasRole("GPS")
                .requestMatchers("/api/transit/**", "/api/reports", "/api/journeys/**", "/api/presence/**", "/actuator/health", "/error").permitAll()
                .anyRequest().denyAll())
            .httpBasic(Customizer.withDefaults()).build();
    }
}
