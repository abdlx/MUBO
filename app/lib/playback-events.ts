"use client";

type PlaybackEvent = {
  event_type: string; session_id: string; track_id?: string; source?: string;
  surface?: string; listened_seconds?: number; completion_ratio?: number;
  recommendation_id?: string; model_version?: string; context?: Record<string, unknown>;
};

let sessionId = crypto.randomUUID();
let lastActivity = Date.now();
let started = false;
const pending: PlaybackEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

export function emitPlaybackEvent(event: Omit<PlaybackEvent, "session_id">) {
  if (Date.now() - lastActivity > 30 * 60_000) {
    if (started) pending.push({ event_type: "SESSION_ENDED", session_id: sessionId });
    sessionId = crypto.randomUUID();
    started = false;
  }
  if (!started) {
    pending.push({ event_type: "SESSION_STARTED", session_id: sessionId });
    started = true;
  }
  lastActivity = Date.now();
  pending.push({ ...event, session_id: sessionId });
  if (pending.length >= 12) void flushPlaybackEvents();
  else if (!timer) timer = setTimeout(() => void flushPlaybackEvents(), 1200);
}

export async function flushPlaybackEvents() {
  clearTimeout(timer);
  timer = undefined;
  if (!pending.length) return;
  const batch = pending.splice(0, 100).map((event) => ({ ...event, event_id: crypto.randomUUID(), occurred_at: new Date().toISOString() }));
  try { await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch), keepalive: true }); }
  catch { /* A service failure must never block audio. */ }
}
