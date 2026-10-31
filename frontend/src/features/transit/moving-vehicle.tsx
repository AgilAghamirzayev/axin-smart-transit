"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleMarker, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Route, Vehicle } from "./types";
import { measurePath, pointAt, wrap } from "./path-motion";

export function MovingVehicle({ vehicle, route, icon, onClick, children }: {
  vehicle: Vehicle; route?: Route; icon?: L.DivIcon; onClick: () => void; children: ReactNode;
}) {
  const marker = useRef<L.Marker | L.CircleMarker | null>(null);
  const progress = useRef(vehicle.progressMeters);
  const previousTime = useRef(vehicle.observedAt);
  const zooming = useRef(false);
  useMapEvents({ zoomstart: () => { zooming.current = true; }, zoomend: () => { zooming.current = false; } });
  const path = route?.paths[vehicle.pathIndex];
  const measured = useMemo(() => path ? measurePath(path) : undefined, [path]);
  const detailed = icon !== undefined;
  useEffect(() => {
    const layer = marker.current;
    if (!layer) return;
    const elapsed = Date.parse(vehicle.observedAt) - Date.parse(previousTime.current);
    previousTime.current = vehicle.observedAt;
    const target = vehicle.progressMeters;
    // Real GPS and stale measurements are not extrapolated or fabricated.
    if (!measured?.cycle || vehicle.source !== "SIMULATED" || vehicle.stale || !Number.isFinite(target)) {
      layer.setLatLng([vehicle.latitude, vehicle.longitude]);
      progress.current = target;
      return;
    }
    const from = Number.isFinite(progress.current) ? progress.current : target;
    const delta = wrap(target - from, measured.cycle);
    // A reconnect/teleport must never animate an entire lap at aircraft speed.
    const discontinuity = elapsed <= 0 || elapsed > 10000 || delta > Math.max(100, vehicle.speedKmh / 3.6 * elapsed / 1000 * 2);
    if (discontinuity) {
      progress.current = target;
      layer.setLatLng(pointAt(measured, target));
      return;
    }
    const duration = Math.min(3500, Math.max(1000, elapsed));
    const start = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const fraction = Math.min(1, (now - start) / duration);
      progress.current = from + delta * fraction;
      if (!zooming.current) layer.setLatLng(pointAt(measured, progress.current));
      if (fraction < 1 || zooming.current) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [vehicle.observedAt, vehicle.progressMeters, vehicle.latitude, vehicle.longitude, vehicle.speedKmh, vehicle.source, vehicle.stale, measured, detailed]);
  // Position is controlled imperatively; React must not jump it to every new snapshot first.
  const [initial] = useState<[number, number]>(() => [vehicle.latitude, vehicle.longitude]);
  return icon ? <Marker ref={node => { marker.current = node; }} position={initial} icon={icon}
    title={vehicle.id + " · " + route?.number} alt={vehicle.id + " avtobusu"} eventHandlers={{click:onClick}}>{children}</Marker>
    : <CircleMarker ref={node => { marker.current = node; }} center={initial} radius={3}
      pathOptions={{color:"#fff",weight:1,fillColor:vehicle.stale?"#aaa":route?.color,fillOpacity:.9}}
      eventHandlers={{click:onClick}}>{children}</CircleMarker>;
}
