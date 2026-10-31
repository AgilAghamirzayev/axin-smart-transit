import type { Route } from "./types";

type Path = Route["paths"][number];
export interface MeasuredPath { path: Path; distances: number[]; length: number; cycle: number }
const radians = (n: number) => n * Math.PI / 180;
export function measurePath(path: Path): MeasuredPath {
  const distances = [0];
  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1], b = path.points[i];
    const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2
      + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude))
      * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
    distances.push(distances[i - 1] + 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h))));
  }
  const length = distances.at(-1) ?? 0;
  return { path, distances, length, cycle: length * (path.closed ? 1 : 2) };
}
export const wrap = (value: number, cycle: number) => ((value % cycle) + cycle) % cycle;
/** Interpolate geographic distance on the actual polyline, never a screen-space chord. */
export function pointAt(measured: MeasuredPath, progress: number): [number, number] {
  const { path, distances, length, cycle } = measured;
  if (!length) return [path.points[0].latitude, path.points[0].longitude];
  const phase = wrap(progress, cycle);
  const offset = phase > length ? cycle - phase : phase;
  let low = 0, high = distances.length - 1;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (distances[mid] <= offset) low = mid; else high = mid;
  }
  const span = distances[high] - distances[low];
  const t = span ? (offset - distances[low]) / span : 0;
  const a = path.points[low], b = path.points[high];
  return [a.latitude + (b.latitude - a.latitude) * t, a.longitude + (b.longitude - a.longitude) * t];
}
