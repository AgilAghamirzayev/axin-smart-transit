package az.transit.analytics;
import java.time.*;
import org.springframework.stereotype.Component;

@Component
public class AnomalyPolicy {
    public record Decision(Instant highSince,boolean alertRequired) {}
    public Decision evaluate(boolean high,Instant previousSince,Instant lastEvaluated,Instant now,
                             Duration duration,Duration maximumGap) {
        if(!high) return new Decision(null,false);
        boolean continuous=previousSince!=null && lastEvaluated!=null &&
            !lastEvaluated.plus(maximumGap).isBefore(now);
        Instant since=continuous?previousSince:now;
        return new Decision(since,!now.isBefore(since.plus(duration)));
    }
}
