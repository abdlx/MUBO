import "server-only";

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseFile } from "music-metadata";
import type { Track } from "../data/tracks";

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".wav", ".webm"]);
const COVER_NAMES = ["cover.jpg", "cover.jpeg", "cover.png", "cover.webp", "folder.jpg", "folder.png", "album.jpg", "album.png"];
const ART_STYLES: Track["art"][] = ["road", "field", "electric", "ocean", "apricot"];
const CACHE_MS = Math.max(1_000, Number(process.env.LIBRARY_SCAN_INTERVAL_MS) || 15_000);

type LibraryEntry = Track & {
  absolutePath: string;
  coverPath: string | null;
  embeddedCover: boolean;
};
let cache: { root: string; expiresAt: number; entries: LibraryEntry[] } | null = null;

function libraryRoot() {
  const configured = process.env.MUSIC_PATH?.trim();
  return configured ? path.resolve(configured) : null;
}

function safeName(value: string) {
  return value.replace(/^\d{1,3}[\s._-]+/, "").replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanTag(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function identityId(kind: "artist" | "album", ...values: string[]) {
  return createHash("sha256").update(`${kind}:${values.map((value) => value.toLocaleLowerCase()).join("\0")}`).digest("hex").slice(0, 20);
}

async function mapConcurrent<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
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
    const entries = await mapConcurrent(files, 6, async (absolutePath) => {
      const relativePath = path.relative(root, absolutePath);
      const id = createHash("sha256").update(relativePath).digest("hex").slice(0, 20);
      const directory = path.dirname(absolutePath);
      let coverPath = coverCache.get(directory);
      if (coverPath === undefined) {
        coverPath = await findCover(directory);
        coverCache.set(directory, coverPath);
      }
      const parts = relativePath.split(path.sep);
      const fallbackAlbum = parts.length > 1 ? safeName(parts.at(-2)!) : "Singles";
      const fallbackArtist = parts.length > 2 ? safeName(parts.at(-3)!) : "Unknown Artist";
      const fallbackTitle = safeName(path.basename(absolutePath, path.extname(absolutePath))) || "Untitled";
      let title = fallbackTitle;
      let artist = fallbackArtist;
      let artists = [fallbackArtist];
      let album = fallbackAlbum;
      let albumArtist = fallbackArtist;
      let duration: number | null = null;
      let embeddedCover = false;
      let trackNumber: number | null = null;
      let discNumber: number | null = null;
      let year: number | null = null;
      let genres: string[] = [];
      try {
        const metadata = await parseFile(absolutePath, { duration: true });
        title = cleanTag(metadata.common.title) ?? fallbackTitle;
        artist = cleanTag(metadata.common.artist) ?? cleanTag(metadata.common.albumartist) ?? fallbackArtist;
        artists = (metadata.common.artists ?? [artist]).map(cleanTag).filter((value): value is string => Boolean(value));
        if (!artists.length) artists = [artist];
        album = cleanTag(metadata.common.album) ?? fallbackAlbum;
        albumArtist = cleanTag(metadata.common.albumartist) ?? artist;
        duration = Number.isFinite(metadata.format.duration) && metadata.format.duration! > 0 ? metadata.format.duration! : null;
        embeddedCover = Boolean(metadata.common.picture?.length);
        trackNumber = metadata.common.track.no;
        discNumber = metadata.common.disk.no;
        year = metadata.common.year ?? null;
        genres = (metadata.common.genre ?? []).map(cleanTag).filter((value): value is string => Boolean(value));
      } catch {
        // A damaged or unusual file should not prevent the rest of the library loading.
      }
      const artistIds = artists.map((name) => identityId("artist", name));
      const albumId = identityId("album", albumArtist, album);
      return {
        id,
        slug: id,
        title,
        artist,
        artists,
        artistIds,
        album,
        albumArtist,
        albumId,
        duration,
        trackNumber,
        discNumber,
        year,
        genres,
        art: ART_STYLES[Number.parseInt(id.slice(0, 2), 16) % ART_STYLES.length],
        coverImage: coverPath || embeddedCover ? `/api/tracks/${id}/cover` : null,
        streamUrl: `/api/tracks/${id}/stream`,
        absolutePath,
        coverPath: coverPath ?? null,
        embeddedCover,
      } satisfies LibraryEntry;
    });
    entries.sort((a, b) =>
      a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" }) ||
      a.album.localeCompare(b.album, undefined, { sensitivity: "base" }) ||
      (a.discNumber ?? 1) - (b.discNumber ?? 1) ||
      (a.trackNumber ?? Number.MAX_SAFE_INTEGER) - (b.trackNumber ?? Number.MAX_SAFE_INTEGER) ||
      a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }),
    );
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
    artists: entry.artists,
    artistIds: entry.artistIds,
    album: entry.album,
    albumArtist: entry.albumArtist,
    albumId: entry.albumId,
    duration: entry.duration,
    trackNumber: entry.trackNumber,
    discNumber: entry.discNumber,
    year: entry.year,
    genres: entry.genres,
    art: entry.art,
    coverImage: entry.coverImage,
    streamUrl: entry.streamUrl,
  };
}
