export type CrowdLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export interface Stop { id: string; name: string; latitude: number; longitude: number }
export interface Route {
  id: string; name: string; number: string; source: string; color: string; stops: Stop[];
  paths: { points: { latitude: number; longitude: number }[]; closed: boolean }[];
  stopMatches: { stopId: string; pathIndex: number; progressMeters: number; distanceMeters: number }[];
}
export interface NetworkCatalog {
  metadata: {
    version: string; importedAt: string; routeCount: number; uniqueRouteNumbers: number; pathCount: number;
    stopCount: number; matchedStopCount: number; associationThresholdMeters: number; simplificationToleranceMeters: number;
    sources: { title: string; url: string; license: string; resourceUpdatedAt: string }[];
  };
  routes: Route[]; stops: Stop[];
}
export interface Vehicle {
  id: string; routeId: string; latitude: number; longitude: number; speedKmh: number;
  observedAt: string; source: string; stale: boolean; crowdLevel: CrowdLevel; etaMinutes: number | null; pathIndex: number; progressMeters: number; gpsParticipants: number; nominalCapacity: number;
}
export interface RouteAnalytics {
  routeId: string; level: CrowdLevel; activeVehicles: number; totalVehicles: number;
  reporters: number; highReports: number; highRatio: number; highSince: string | null; highSeconds: number; gpsParticipants: number; nominalCapacity: number;
}
export interface TransitSnapshot {
  generatedAt: string; simulation: boolean; anomalyDurationSeconds: number;
  minimumReporters: number; highRatioThreshold: number; reportFreshnessSeconds: number; gpsFreshnessSeconds: number;
  vehicles: Vehicle[]; analytics: RouteAnalytics[];
}
export interface Alert {
  id: string; routeId: string; startedAt: string; triggeredAt: string;
  resolvedAt: string | null; acknowledgedAt: string | null;
}
export interface Dashboard { transit: TransitSnapshot; alerts: Alert[] }
