import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReportDialog } from "./report-dialog";
import type { Vehicle } from "@/features/transit/types";
const vehicle: Vehicle = { id: "D1-1", routeId: "D1", latitude: 40.38, longitude: 49.84, speedKmh: 22,
  observedAt: new Date().toISOString(), source: "SIMULATED", stale: false, crowdLevel: "UNKNOWN", etaMinutes: 3, pathIndex: 0, progressMeters: 0, gpsParticipants:0, nominalCapacity:60 };
describe("crowd submission", () => {
  it("requires a level then persists the chosen vehicle and anonymous identity", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "saved" }), { status: 201 }));
    render(<ReportDialog vehicle={vehicle} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Bildirişi göndər" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Yüksək/ }));
    fireEvent.click(screen.getByRole("button", { name: "Bildirişi göndər" }));
    await screen.findByText("Səsiniz qeydə alındı.");
    expect(fetch).toHaveBeenCalledTimes(1);
    const options = fetch.mock.calls[0][1]!;
    expect(JSON.parse(options.body as string)).toMatchObject({ vehicleId: "D1-1", level: "HIGH", reporterId: localStorage.getItem("transit-reporter") });
  });
  it("shows API failure instead of false success and preserves idempotency on retry", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Yeni bildiriş üçün 30 saniyə gözləyin" }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "saved" }), { status: 201 }));
    render(<ReportDialog vehicle={vehicle} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Aşağı/ }));
    fireEvent.click(screen.getByRole("button", { name: "Bildirişi göndər" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("Səsiniz qeydə alındı.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bildirişi göndər" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string).requestId).toBe(JSON.parse(fetch.mock.calls[1][1]!.body as string).requestId);
  });
});
