package az.transit.network;
/** Geometric candidate, not an authoritative served-stop assignment. */
public record StopMatch(String stopId, int pathIndex, double progressMeters, double distanceMeters) {}
