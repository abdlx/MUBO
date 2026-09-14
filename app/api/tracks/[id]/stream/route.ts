import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { getLibraryEntry } from "../../../../lib/music-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac",
  ".ogg": "audio/ogg", ".opus": "audio/ogg", ".wav": "audio/wav", ".webm": "audio/webm",
};

async function serve(request: Request, id: string, headOnly = false) {
  const entry = await getLibraryEntry(id);
  if (!entry) return new Response("Track not found", { status: 404 });
  const { size } = await fs.stat(entry.absolutePath);
  const contentType = MIME_TYPES[path.extname(entry.absolutePath).toLowerCase()] ?? "application/octet-stream";
  const range = request.headers.get("range");
  if (size === 0) {
    if (range) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */0" } });
    return new Response(null, { headers: { "Accept-Ranges": "bytes", "Content-Length": "0", "Content-Type": contentType } });
  }
  let start = 0;
  let end = size - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    if (!match[1] && match[2]) {
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    } else {
      if (match[1]) start = Number(match[1]);
      if (match[2]) end = Number(match[2]);
    }
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    end = Math.min(end, size - 1);
    status = 206;
  }
  const headers = new Headers({
    "Accept-Ranges": "bytes", "Cache-Control": "private, no-cache",
    "Content-Length": String(end - start + 1), "Content-Type": contentType,
  });
  if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  if (headOnly) return new Response(null, { status, headers });
  return new Response(Readable.toWeb(createReadStream(entry.absolutePath, { start, end })) as ReadableStream, { status, headers });
}

export async function GET(request: Request, context: RouteContext<"/api/tracks/[id]/stream">) {
  return serve(request, (await context.params).id);
}

export async function HEAD(request: Request, context: RouteContext<"/api/tracks/[id]/stream">) {
  return serve(request, (await context.params).id, true);
}
