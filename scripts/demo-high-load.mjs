// Explicit synthetic passengers for demonstrating FR-09. Never runs automatically.
import { randomUUID } from "node:crypto";
const base = process.env.API_URL ?? "http://127.0.0.1:8080/api";
const durationSeconds = Number(process.env.DEMO_SECONDS ?? 660);
async function defaultVehicle() {
  const response = await fetch(base + "/transit/network", { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Network unavailable: " + response.status);
  const network = await response.json();
  const route = network.routes.find(route => route.number === "5") ?? network.routes[0];
  const snapshotResponse = await fetch(base + "/transit/snapshot?routeId=" + encodeURIComponent(route.id), { signal: AbortSignal.timeout(10000) });
  if (!snapshotResponse.ok) throw new Error("Fleet unavailable: " + snapshotResponse.status);
  const snapshot = await snapshotResponse.json();
  const vehicle = snapshot.vehicles.find(vehicle => !vehicle.stale && vehicle.source === "SIMULATED");
  if (!vehicle) throw new Error("No fresh simulated vehicle available");
  return vehicle.id;
}
const vehicleId = process.env.DEMO_VEHICLE ?? await defaultVehicle();
if (!Number.isFinite(durationSeconds) || durationSeconds < 0) throw new Error("Invalid DEMO_SECONDS");
const reporters = Array.from({ length: 3 }, () => randomUUID());
const start = Date.now();
console.log("SYNTHETIC crowd reports:", vehicleId, "for", durationSeconds, "seconds. Ctrl+C stops.");
while (Date.now() - start <= durationSeconds * 1000) {
  for (const reporterId of reporters) {
    const response = await fetch(base + "/reports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: randomUUID(), reporterId, vehicleId, level: "HIGH" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Report rejected: " + response.status + " " + await response.text());
  }
  console.log(new Date().toISOString(), "3 HIGH reports stored");
  if (Date.now() - start + 35000 > durationSeconds * 1000) break;
  await new Promise(resolve => setTimeout(resolve, 35000));
}
console.log("Done. Reports expire after 2 minutes and the episode resolves automatically.");
