import { getLibrary, publicTrack } from "../../lib/music-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const library = await getLibrary();
  return Response.json({
    tracks: library.entries.map(publicTrack),
    musicPathConfigured: library.root !== null,
    ...(library.error ? { error: library.error } : {}),
  }, { headers: { "Cache-Control": "no-store" } });
}
