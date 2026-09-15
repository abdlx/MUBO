import { localUserId, serviceRequest, syncCatalog } from "../../../lib/recommendation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ surface: string }> }) {
  const { surface } = await params;
  if (!/^(home|quick-picks|mixes|shuffle|smart-shuffle|autoplay|radio|taste-profile)$/.test(surface)) return Response.json({ error: "Unknown surface" }, { status: 404 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  try {
    await syncCatalog();
    const result = await serviceRequest(surface === "taste-profile" ? "/taste-profile" : `/recommendations/${surface}`,
      { ...body, user_id: localUserId() });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Recommendations unavailable" }, { status: 503 });
  }
}
