import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const allowed = (request.method === "GET" && ["transit/network", "transit/snapshot", "operator/snapshot", "operator/dispatches", "operator/dispatches/options"].includes(endpoint))
    || (request.method === "POST" && (["reports","journeys/plan","presence","operator/dispatches"].includes(endpoint) || /^presence\/[a-f0-9-]{36}\/(sample|end)$/.test(endpoint) || /^operator\/alerts\/[a-f0-9-]{36}\/acknowledge$/.test(endpoint)))
    || (request.method === "PUT" && /^telemetry\/vehicles\/[A-Za-z0-9-]+$/.test(endpoint));
  if (!allowed) return Response.json({ detail: "Endpoint tapılmadı" }, { status: 404 });
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && body.length > 4096) return Response.json({ detail: "Sorğu çox böyükdür" }, { status: 413 });
    const upstream = await fetch((process.env.BACKEND_URL ?? "http://127.0.0.1:8080") + "/api/" + endpoint + request.nextUrl.search, {
      method: request.method, body, cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", ...(request.headers.get("authorization") ? { Authorization: request.headers.get("authorization")! } : {}) },
    });
    return new Response(await upstream.arrayBuffer(), { status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" } });
  } catch { return Response.json({ detail: "Backend ilə bağlantı yoxdur. Serverin işlədiyini yoxlayın." }, { status: 503 }); }
}
export { proxy as GET, proxy as POST, proxy as PUT };
