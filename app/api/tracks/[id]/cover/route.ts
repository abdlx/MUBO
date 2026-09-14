import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { parseFile } from "music-metadata";
import { getLibraryEntry } from "../../../../lib/music-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MIME_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_request: Request, context: RouteContext<"/api/tracks/[id]/cover">) {
  const entry = await getLibraryEntry((await context.params).id);
  if (!entry) return new Response("Cover not found", { status: 404 });
  if (entry.embeddedCover) {
    try {
      const metadata = await parseFile(entry.absolutePath, { duration: false });
      const picture = metadata.common.picture?.find((item) => item.type?.toLowerCase().includes("front")) ?? metadata.common.picture?.[0];
      if (picture) {
        const format = picture.format.toLowerCase();
        const contentType = format.includes("/") ? format : MIME_TYPES[`.${format}`] ?? "application/octet-stream";
        return new Response(Readable.toWeb(Readable.from([picture.data])) as ReadableStream, { headers: {
          "Cache-Control": "public, max-age=3600", "Content-Length": String(picture.data.byteLength), "Content-Type": contentType,
        } });
      }
    } catch {}
  }
  if (entry.coverPath) {
    const { size } = await fs.stat(entry.coverPath);
    return new Response(Readable.toWeb(createReadStream(entry.coverPath)) as ReadableStream, { headers: {
      "Cache-Control": "public, max-age=3600", "Content-Length": String(size),
      "Content-Type": MIME_TYPES[path.extname(entry.coverPath).toLowerCase()] ?? "application/octet-stream",
    } });
  }
  return new Response("Cover not found", { status: 404 });
}
