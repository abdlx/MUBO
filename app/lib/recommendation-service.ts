import "server-only";
import { getLibrary, publicTrack } from "./music-library";

const endpoint = process.env.RECOMMENDATION_API_URL;
const key = process.env.RECOMMENDATION_API_KEY ?? "local-development-key";
let syncedSignature = "";

export async function serviceRequest(path: string, body: unknown) {
  if (!endpoint) throw new Error("Recommendations are not configured");
  const response = await fetch(`${endpoint}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Service-Key": key },
    body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(2400),
  });
  if (!response.ok) throw new Error(`Recommendation service returned ${response.status}`);
  return response.json();
}

export async function syncCatalog() {
  const entries = (await getLibrary()).entries.map(publicTrack);
  const signature = entries.map((item) => `${item.id}:${item.title}:${item.artist}:${item.genres.join(",")}`).join("|");
  if (signature !== syncedSignature) {
    await serviceRequest("/catalog", entries.map((item) => ({
      id: item.id, title: item.title, artist: item.artist, artist_ids: item.artistIds,
      album: item.album, album_id: item.albumId, genres: item.genres,
      duration: item.duration, release_year: item.year,
    })));
    syncedSignature = signature;
  }
  return entries;
}

export function localUserId() {
  // No accounts exist in this app yet. Keep identity server-controlled until auth is added.
  return process.env.RECOMMENDATION_USER_ID ?? "local-listener";
}
