package az.transit.analytics;
import java.util.*;
import az.transit.crowding.*;
import org.springframework.stereotype.Component;

@Component
public class CrowdingPolicy {
    public record Summary(CrowdLevel level,int reporters,int highReports,double highRatio) {}
    /** One latest vote per anonymous browser identity in a freshness window. Input sorted newest first. */
    public Summary summarize(List<CrowdReport> reports,int minimum,double threshold) {
        Map<String,CrowdReport> latest=new LinkedHashMap<>();
        reports.stream().sorted(Comparator.comparing(CrowdReport::createdAt).reversed())
            .forEach(r->latest.putIfAbsent(r.reporterId(),r));
        int count=latest.size();
        int high=(int)latest.values().stream().filter(r->r.level()==CrowdLevel.HIGH).count();
        if(count==0) return new Summary(CrowdLevel.UNKNOWN,0,0,0);
        double ratio=(double)high/count;
        CrowdLevel level;
        if(count>=minimum && ratio>=threshold) level=CrowdLevel.HIGH;
        else {
            double average=latest.values().stream().mapToInt(r->r.level()==CrowdLevel.LOW?1:r.level()==CrowdLevel.MEDIUM?2:3).average().orElse(0);
            level=average<1.5?CrowdLevel.LOW:CrowdLevel.MEDIUM;
        }
        return new Summary(level,count,high,ratio);
    }
}
