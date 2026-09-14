import "server-only";

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Track } from "../data/tracks";

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".wav", ".webm"]);
const COVER_NAMES = ["cover.jpg", "cover.jpeg", "cover.png", "cover.webp", "folder.jpg", "folder.png", "album.jpg", "album.png"];
const ART_STYLES: Track["art"][] = ["road", "field", "electric", "ocean", "apricot"];
const CACHE_MS = Math.max(1_000, Number(process.env.LIBRARY_SCAN_INTERVAL_MS) || 15_000);

type LibraryEntry = Track & { absolutePath: string; coverPath: string | null };
let cache: { root: string; expiresAt: number; entries: LibraryEntry[] } | null = null;

function libraryRoot() {
  const configured = process.env.MUSIC_PATH?.trim();
  return configured ? path.resolve(configured) : null;
}

function safeName(value: string) {
  return value.replace(/^\d{1,3}[\s._-]+/, "").replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
}

async function findCover(directory: string) {
  for (const name of COVER_NAMES) {
    try {
      const candidate = path.join(/* turbopackIgnore: true */ directory, name);
      if ((await fs.stat(/* turbopackIgnore: true */ candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

async function walk(directory: string, output: string[]) {
  const items = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(items.map(async (item) => {
    if (item.name.startsWith(".")) return;
    const itemPath = path.join(directory, item.name);
    if (item.isDirectory()) await walk(itemPath, output);
    else if (item.isFile() && AUDIO_EXTENSIONS.has(path.extname(item.name).toLowerCase())) output.push(itemPath);
  }));
}

export async function getLibrary(): Promise<{ root: string | null; entries: LibraryEntry[]; error?: string }> {
  const root = libraryRoot();
  if (!root) return { root: null, entries: [], error: "MUSIC_PATH is not configured." };
  if (cache?.root === root && cache.expiresAt > Date.now()) return { root, entries: cache.entries };

  try {
    const rootStat = await fs.stat(root);
    if (!rootStat.isDirectory()) return { root, entries: [], error: "MUSIC_PATH is not a directory." };
    const files: string[] = [];
    await walk(root, files);
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    const coverCache = new Map<string, string | null>();
    const entries = await Promise.all(files.map(async (absolutePath) => {
      const relativePath = path.relative(root, absolutePath);
      const id = createHash("sha256").update(relativePath).digest("hex").slice(0, 20);
      const directory = path.dirname(absolutePath);
      let coverPath = coverCache.get(directory);
      if (coverPath === undefined) {
        coverPath = await findCover(directory);
        coverCache.set(directory, coverPath);
      }
      const parts = relativePath.split(path.sep);
      const album = parts.length > 1 ? safeName(parts.at(-2)!) : "Singles";
      const artist = parts.length > 2 ? safeName(parts.at(-3)!) : "Unknown Artist";
      return {
        id,
        slug: id,
        title: safeName(path.basename(absolutePath, path.extname(absolutePath))) || "Untitled",
        artist,
        album,
        duration: null,
        art: ART_STYLES[Number.parseInt(id.slice(0, 2), 16) % ART_STYLES.length],
        coverImage: coverPath ? `/api/tracks/${id}/cover` : null,
        streamUrl: `/api/tracks/${id}/stream`,
        absolutePath,
        coverPath: coverPath ?? null,
      } satisfies LibraryEntry;
    }));
    cache = { root, entries, expiresAt: Date.now() + CACHE_MS };
    return { root, entries };
  } catch (error) {
    return { root, entries: [], error: error instanceof Error ? error.message : "Unable to read the music directory." };
  }
}

export async function getLibraryEntry(id: string) {
  if (!/^[a-f0-9]{20}$/.test(id)) return null;
  return (await getLibrary()).entries.find((entry) => entry.id === id) ?? null;
}

export function publicTrack(entry: LibraryEntry): Track {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    artist: entry.artist,
    album: entry.album,
    duration: entry.duration,
    art: entry.art,
    coverImage: entry.coverImage,
    streamUrl: entry.streamUrl,
  };
}
