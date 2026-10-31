package az.transit.journey;
import java.util.List;

/** Directed stop visits: waiting for the correct direction is not time spent riding a detour. */
public final class JourneyTiming {
    public record Timing(double boardSeconds,double alightSeconds,double boardProgress,double alightProgress) {}
    private JourneyTiming() {}
    public static double wrap(double value,double cycle) { return ((value%cycle)+cycle)%cycle; }
    public static Timing ride(double progress,double speedMps,double cycle,boolean repeat,
                              List<Double> boarding,List<Double> alighting,double readySeconds) {
        return ride(progress,speedMps,cycle,repeat,false,boarding,alighting,readySeconds);
    }
    public static Timing ride(double progress,double speedMps,double cycle,boolean repeat,boolean shuttle,
                              List<Double> boarding,List<Double> alighting,double readySeconds) {
        if(!Double.isFinite(speedMps)||speedMps<=0||!Double.isFinite(cycle)||cycle<=0)return null;
        double shortest=Double.POSITIVE_INFINITY;
        for(double from:boarding) for(double to:alighting) {
            double delta=rideDistance(from,to,cycle,repeat,shuttle);
            if(delta>=1)shortest=Math.min(shortest,delta);
        }
        Timing best=null;
        for(double from:boarding) for(double to:alighting) {
            double delta=rideDistance(from,to,cycle,repeat,shuttle);
            // Nearby projections of the same stop can differ slightly. Do not board an
            // earlier opposite-direction visit and carry the passenger around the route.
            if(delta<1 || delta>shortest+100)continue;
            double atReady=progress+readySeconds*speedMps;
            double distance=repeat?wrap(from-atReady,cycle):from-atReady;
            if(distance<0)continue;
            double board=readySeconds+distance/speedMps,arrive=board+delta/speedMps;
            if(best==null || arrive<best.alightSeconds()-0.001
                || (Math.abs(arrive-best.alightSeconds())<=0.001 && board>best.boardSeconds()))
                best=new Timing(board,arrive,from,from+delta);
        }
        return best;
    }
    private static double rideDistance(double from,double to,double cycle,boolean repeat,boolean shuttle) {
        if(shuttle) {
            double terminal=cycle/2;
            boolean outbound=from<terminal && to<=terminal;
            boolean inbound=from>=terminal && to>=terminal;
            // A passenger leg must not cross either reversal at the terminal.
            return (outbound||inbound)&&to>from?to-from:-1;
        }
        return repeat?wrap(to-from,cycle):to-from;
    }
}
