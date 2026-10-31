export interface LocationFix { lat:number; lng:number; accuracy:number; timestamp:number }
/** Keep device-reported uncertainty; never manufacture a more precise coordinate. */
export function acceptLocation(previous: LocationFix | null, next: LocationFix, now:number): boolean {
  if (![next.lat,next.lng,next.accuracy,next.timestamp].every(Number.isFinite)
    || Math.abs(next.lat)>90 || Math.abs(next.lng)>180 || next.accuracy<=0
    || now-next.timestamp>15000 || next.timestamp>now+5000) return false;
  if (!previous) return true;
  if (next.timestamp<=previous.timestamp) return false;
  // Briefly retain a recent precise fix when a much coarser network fix arrives.
  // After 10 seconds accept the fresh coarse fix honestly, rather than freeze a moving person.
  return next.accuracy<=Math.max(previous.accuracy*2,50) || now-previous.timestamp>10000;
}
