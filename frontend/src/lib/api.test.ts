import { it, expect, vi } from "vitest";
import { api, ApiError } from "./api";
it("turns backend error detail into a typed error", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "GPS köhnədir" }), { status: 409 }));
  await expect(api("/reports")).rejects.toEqual(new ApiError("GPS köhnədir", 409));
});
it("handles empty acknowledgement responses", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  await expect(api("/operator/alerts/id/acknowledge", { method: "POST" })).resolves.toBeUndefined();
});
