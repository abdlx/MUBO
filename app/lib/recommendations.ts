import type { Track } from "../data/tracks";

export type RecommendationItem = {
  trackId: string; recommendationId?: string; modelVersion?: string; explanation?: string;
};
export type HomeModule = { id: string; title: string; layout: "compact" | "cards"; items: RecommendationItem[] };

export async function getRecommendations(surface: string, context: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`/api/recommendations/${surface}`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context), signal: AbortSignal.timeout(3200) });
    return response.ok ? response.json() : null;
  } catch { return null; }
}

export function resolveRecommended(items: RecommendationItem[], tracks: Track[]) {
  const byId = new Map(tracks.map((track) => [track.id, track]));
  return items.flatMap((item) => { const track = byId.get(item.trackId); return track ? [{ track, recommendation: item }] : []; });
}
