import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { getLibraryEntry } from "../../../../lib/music-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MIME_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_request: Request, context: RouteContext<"/api/tracks/[id]/cover">) {
  const entry = await getLibraryEntry((await context.params).id);
  if (!entry?.coverPath) return new Response("Cover not found", { status: 404 });
  const { size } = await fs.stat(entry.coverPath);
  return new Response(Readable.toWeb(createReadStream(entry.coverPath)) as ReadableStream, { headers: {
    "Cache-Control": "public, max-age=3600", "Content-Length": String(size),
    "Content-Type": MIME_TYPES[path.extname(entry.coverPath).toLowerCase()] ?? "application/octet-stream",
  } });
}
