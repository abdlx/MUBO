import { localUserId, serviceRequest } from "../../lib/recommendation-service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!Array.isArray(body) || body.length > 100 || body.some((item) => !item || typeof item !== "object" || typeof item.event_type !== "string" || typeof item.session_id !== "string")) {
    return Response.json({ error: "Invalid event batch" }, { status: 400 });
  }
  try {
    const result = await serviceRequest("/events", body.map((item) => ({ ...item, user_id: localUserId() })));
    return Response.json(result);
  } catch {
    return Response.json({ error: "Telemetry unavailable" }, { status: 503 });
  }
}
