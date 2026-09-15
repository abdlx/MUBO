"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryResponse, Track } from "../data/tracks";
import { emitPlaybackEvent, flushPlaybackEvents } from "../lib/playback-events";
import { getRecommendations, resolveRecommended, type RecommendationItem } from "../lib/recommendations";

interface PlayerContextType {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  libraryError: string | null;
  musicPathConfigured: boolean;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  volume: number;
  setVolume: (value: number) => void;
  queue: Track[];
  recommendedTrackIds: string[];
  shuffleMode: "off" | "standard" | "smart";
  repeatMode: "off" | "all" | "one";
  setShuffleMode: (mode: "off" | "standard" | "smart") => void;
  cycleRepeat: () => void;
  playQueue: (queue: Track[], start?: Track, mode?: "off" | "standard" | "smart", recommendations?: RecommendationItem[]) => void;
  startRadio: (kind: "track" | "artist" | "album" | "playlist", seed: Track, source?: Track[]) => void;
  playerOpen: boolean;
  likedTrackIds: string[];
  toggleLike: () => void;
  openPlayer: () => void;
  closePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);
const TimingContext = createContext<{ currentTime: number; duration: number } | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.8);
  const tracksRef = useRef<Track[]>([]);
  const currentRef = useRef<Track | null>(null);
  const queueRef = useRef<Track[]>([]);
  const shuffleRef = useRef<"off" | "standard" | "smart">("off");
  const repeatRef = useRef<"off" | "all" | "one">("off");
  const historyRef = useRef<string[]>([]);
  const recommendationsRef = useRef(new Map<string, RecommendationItem>());
  const sourceRef = useRef("library");
  const progressRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastPositionRef = useRef(0);
  const completionRef = useRef(false);
  const queueRevisionRef = useRef(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [musicPathConfigured, setMusicPathConfigured] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, updateVolume] = useState(0.8);
  const [queue, setQueue] = useState<Track[]>([]);
  const [recommendedTrackIds, setRecommendedTrackIds] = useState<string[]>([]);
  const [shuffleMode, updateShuffleMode] = useState<"off" | "standard" | "smart">("off");
  const [repeatMode, updateRepeatMode] = useState<"off" | "all" | "one">("off");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const likedRef = useRef<string[]>([]);
  const openPlayer = useCallback(() => setPlayerOpen(true), []);
  const closePlayer = useCallback(() => setPlayerOpen(false), []);
  const toggleLike = useCallback(() => {
    const track = currentRef.current;
    if (!track) return;
    const liked = !likedRef.current.includes(track.id);
    const next = liked ? [...likedRef.current, track.id] : likedRef.current.filter((id) => id !== track.id);
    likedRef.current = next;
    setLikedTrackIds(next);
    try { localStorage.setItem("mubo_liked_tracks", JSON.stringify(next)); } catch {}
    emitPlaybackEvent({ event_type: liked ? "TRACK_LIKED" : "TRACK_UNLIKED", track_id: track.id,
      recommendation_id: recommendationsRef.current.get(track.id)?.recommendationId,
      model_version: recommendationsRef.current.get(track.id)?.modelVersion });
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mubo_liked_tracks") ?? "[]");
      if (Array.isArray(saved)) {
        likedRef.current = saved.filter((id): id is string => typeof id === "string");
        setLikedTrackIds(likedRef.current);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onExit = () => void flushPlaybackEvents();
    window.addEventListener("pagehide", onExit);
    return () => window.removeEventListener("pagehide", onExit);
  }, []);
  const setVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value));
    volumeRef.current = next;
    if (audioRef.current) audioRef.current.volume = next;
    updateVolume(next);
  }, []);

  const setShuffleMode = useCallback((mode: "off" | "standard" | "smart") => {
    shuffleRef.current = mode;
    updateShuffleMode(mode);
    historyRef.current = [];
    emitPlaybackEvent({ event_type: "SHUFFLE_MODE_CHANGED", track_id: currentRef.current?.id, context: { mode } });
    if (mode !== "off") emitPlaybackEvent({ event_type: mode === "smart" ? "SMART_SHUFFLE_STARTED" : "SHUFFLE_STARTED", track_id: currentRef.current?.id });
    const revision = ++queueRevisionRef.current;
    const items = queueRef.current.filter((item) => !recommendationsRef.current.has(item.id));
    recommendationsRef.current.clear();
    setRecommendedTrackIds([]);
    if (mode === "off") { queueRef.current = items; setQueue(items); return; }
    void getRecommendations(mode === "smart" ? "smart-shuffle" : "shuffle", {
      source_ids: items.map((item) => item.id), seed_ids: currentRef.current ? [currentRef.current.id] : [],
      seed: crypto.randomUUID(), limit: 30,
    }).then((data) => {
      if (!data || revision !== queueRevisionRef.current) return;
      const current = currentRef.current;
      if (mode === "standard") {
        const byId = new Map(items.map((item) => [item.id, item]));
        const ordered = ((data.trackIds as string[]) ?? []).map((id) => byId.get(id)).filter((item): item is Track => Boolean(item));
        queueRef.current = [current, ...ordered.filter((item) => item.id !== current?.id)].filter((item): item is Track => Boolean(item));
      } else {
        const suggestions = resolveRecommended((data.items as RecommendationItem[]) ?? [], tracksRef.current);
        const interval = Math.max(4, Math.min(8, Number(data.insertionInterval) || 6));
        suggestions.forEach(({ track, recommendation }) => recommendationsRef.current.set(track.id, recommendation));
        const expanded: Track[] = [];
        [current, ...items.filter((item) => item.id !== current?.id)].filter((item): item is Track => Boolean(item)).forEach((item, index) => {
          expanded.push(item);
          if (index > 0 && index % interval === 0 && suggestions[Math.floor(index / interval) - 1]) expanded.push(suggestions[Math.floor(index / interval) - 1].track);
        });
        queueRef.current = expanded;
        setRecommendedTrackIds(suggestions.map(({ track }) => track.id));
      }
      setQueue(queueRef.current);
    });
  }, []);
  const cycleRepeat = useCallback(() => {
    const next = repeatRef.current === "off" ? "all" : repeatRef.current === "all" ? "one" : "off";
    repeatRef.current = next;
    updateRepeatMode(next);
  }, []);

  const selectTrack = useCallback((track: Track, shouldPlay = true) => {
    const audio = audioRef.current;
    const previous = currentRef.current;
    if (previous && previous.id !== track.id && !completionRef.current && elapsedRef.current > 0) {
      emitPlaybackEvent({ event_type: elapsedRef.current < 15 ? "PLAY_EARLY_SKIPPED" : "PLAY_SKIPPED", track_id: previous.id,
        listened_seconds: elapsedRef.current, completion_ratio: audio?.duration ? elapsedRef.current / audio.duration : undefined,
        recommendation_id: recommendationsRef.current.get(previous.id)?.recommendationId,
        model_version: recommendationsRef.current.get(previous.id)?.modelVersion, source: sourceRef.current });
    }
    currentRef.current = track;
    progressRef.current = 0;
    elapsedRef.current = 0;
    lastPositionRef.current = 0;
    completionRef.current = false;
    setCurrentTrack(track);
    setCurrentTime(0);
    try { localStorage.setItem("mubo_now_playing", track.id); } catch {}
    if (!audio) return;
    if (audio.src !== new URL(track.streamUrl, window.location.href).href) {
      audio.src = track.streamUrl;
      audio.load();
    }
    if (shouldPlay) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, []);

  const nextTrack = useCallback(() => {
    const candidates = queueRef.current.length ? queueRef.current : tracksRef.current;
    if (!candidates.length) return;
    const current = currentRef.current;
    const index = candidates.findIndex((track) => track.id === current?.id);
    let next: Track | undefined;
    if (shuffleRef.current === "off") {
      next = candidates[index + 1];
      if (!next && repeatRef.current === "all") next = candidates[0];
    } else {
      const available = candidates.filter((track) => track.id !== current?.id && !historyRef.current.includes(track.id));
      const pool = available.length ? available : repeatRef.current === "all" ? candidates.filter((track) => track.id !== current?.id) : [];
      if (!available.length && repeatRef.current === "all") historyRef.current = [];
      // The service builds a spaced, seeded queue; this only covers a service outage.
      next = pool[0];
    }
    if (next) { if (current) historyRef.current.push(current.id); selectTrack(next, true); }
    else if (current && repeatRef.current !== "one") {
      void getRecommendations("autoplay", { seed_ids: [current.id], exclude_ids: [current.id, ...historyRef.current.slice(-20)], limit: 10, seed: crypto.randomUUID() })
        .then((data) => {
          const additions = resolveRecommended((data?.items as RecommendationItem[]) ?? [], tracksRef.current);
          if (additions.length) {
            additions.forEach(({ track, recommendation }) => recommendationsRef.current.set(track.id, recommendation));
            queueRef.current = [...candidates, ...additions.map(({ track }) => track)];
            setQueue(queueRef.current);
            sourceRef.current = "autoplay";
            selectTrack(additions[0].track, true);
          } else audioRef.current?.pause();
        });
    } else audioRef.current?.pause();
  }, [selectTrack]);

  function seekToStartAndPlay() { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => setIsPlaying(false)); } }

  const prevTrack = useCallback(() => {
    const queue = queueRef.current.length ? queueRef.current : tracksRef.current;
    if (!queue.length) return;
    const previousId = historyRef.current.pop();
    if (previousId) { const previous = queue.find((track) => track.id === previousId); if (previous) { selectTrack(previous, true); return; } }
    if ((audioRef.current?.currentTime ?? 0) > 3) { seekToStartAndPlay(); return; }
    const index = Math.max(0, queue.findIndex((track) => track.id === currentRef.current?.id));
    selectTrack(queue[(index - 1 + queue.length) % queue.length], true);
  }, [selectTrack]);

  const playQueue = useCallback((items: Track[], start?: Track, mode: "off" | "standard" | "smart" = "off", recommendations: RecommendationItem[] = []) => {
    if (!items.length) return;
    const revision = ++queueRevisionRef.current;
    recommendationsRef.current.clear();
    recommendations.forEach((item) => recommendationsRef.current.set(item.trackId, item));
    setRecommendedTrackIds([]);
    sourceRef.current = "collection";
    queueRef.current = items;
    setQueue(items);
    historyRef.current = [];
    shuffleRef.current = mode;
    updateShuffleMode(mode);
    emitPlaybackEvent({ event_type: "SHUFFLE_MODE_CHANGED", track_id: (start ?? items[0]).id, context: { mode } });
    if (mode !== "off") emitPlaybackEvent({ event_type: mode === "smart" ? "SMART_SHUFFLE_STARTED" : "SHUFFLE_STARTED", track_id: (start ?? items[0]).id });
    selectTrack(start ?? items[0], true);
    if (mode !== "off") {
      void getRecommendations(mode === "smart" ? "smart-shuffle" : "shuffle", {
        source_ids: items.map((item) => item.id), seed_ids: [(start ?? items[0]).id],
        exclude_ids: [start?.id], seed: crypto.randomUUID(), limit: Math.min(30, items.length),
      }).then((data) => {
        if (!data || queueRevisionRef.current !== revision) return;
        const byId = new Map(tracksRef.current.map((track) => [track.id, track]));
        const current = currentRef.current;
        if (mode === "standard") {
          const ordered = ((data.trackIds as string[]) ?? []).map((id) => byId.get(id)).filter((item): item is Track => Boolean(item));
          if (ordered.length) queueRef.current = [current, ...ordered.filter((item) => item.id !== current?.id)].filter((item): item is Track => Boolean(item));
        } else {
          const suggestions = resolveRecommended((data.items as RecommendationItem[]) ?? [], tracksRef.current);
          const interval = Math.max(4, Math.min(8, Number(data.insertionInterval) || 6));
          suggestions.forEach(({ track, recommendation }) => recommendationsRef.current.set(track.id, recommendation));
          setRecommendedTrackIds(suggestions.map(({ track }) => track.id));
          const native = [current, ...items.filter((item) => item.id !== current?.id)].filter((item): item is Track => Boolean(item));
          const expanded: Track[] = [];
          let suggestionIndex = 0;
          native.forEach((item, index) => {
            expanded.push(item);
            if (index > 0 && index % interval === 0 && suggestions[suggestionIndex]) expanded.push(suggestions[suggestionIndex++].track);
          });
          queueRef.current = expanded;
        }
        setQueue(queueRef.current);
      });
    }
  }, [selectTrack]);

  const startRadio = useCallback((kind: "track" | "artist" | "album" | "playlist", seed: Track, source: Track[] = []) => {
    emitPlaybackEvent({ event_type: "RADIO_STARTED", track_id: seed.id, source: kind, context: { source_id: seed.id } });
    // Start audio immediately; the continuation arrives without interrupting the seed.
    playQueue([seed, ...source.filter((item) => item.id !== seed.id)], seed);
    void getRecommendations("radio", { kind, source_id: seed.id, seed_ids: [seed.id],
      source_ids: source.map((item) => item.id),
      exclude_ids: [seed.id, ...source.map((item) => item.id)], limit: 30, seed: crypto.randomUUID() })
      .then((data) => {
        const additions = resolveRecommended((data?.items as RecommendationItem[]) ?? [], tracksRef.current);
        if (!additions.length || currentRef.current?.id !== seed.id) return;
        additions.forEach(({ track, recommendation }) => recommendationsRef.current.set(track.id, recommendation));
        queueRef.current = [seed, ...additions.map(({ track }) => track)];
        sourceRef.current = "radio";
        setQueue(queueRef.current);
      });
  }, [playQueue]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    const onTime = () => {
      setCurrentTime(audio.currentTime || 0);
      if (!audio.paused && currentRef.current) {
        const delta = (audio.currentTime || 0) - lastPositionRef.current;
        // timeupdate advances in small increments; a seek does not earn listening time.
        if (delta > 0 && delta < 10) elapsedRef.current += delta;
        lastPositionRef.current = audio.currentTime || 0;
        const threshold = Math.floor(elapsedRef.current / 15);
        if (threshold > progressRef.current) {
          progressRef.current = threshold;
          emitPlaybackEvent({ event_type: "PLAY_PROGRESS", track_id: currentRef.current.id,
            listened_seconds: elapsedRef.current, completion_ratio: audio.duration ? elapsedRef.current / audio.duration : undefined,
            source: sourceRef.current });
        }
      }
    };
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => {
      setIsPlaying(true);
      if (currentRef.current) emitPlaybackEvent({ event_type: elapsedRef.current > 0 ? "PLAY_RESUMED" : "PLAY_STARTED",
        track_id: currentRef.current.id, source: sourceRef.current,
        recommendation_id: recommendationsRef.current.get(currentRef.current.id)?.recommendationId,
        model_version: recommendationsRef.current.get(currentRef.current.id)?.modelVersion });
      if (currentRef.current && elapsedRef.current === 0 && recommendationsRef.current.has(currentRef.current.id)) {
        emitPlaybackEvent({ event_type: "RECOMMENDATION_PLAYED", track_id: currentRef.current.id,
          recommendation_id: recommendationsRef.current.get(currentRef.current.id)?.recommendationId,
          model_version: recommendationsRef.current.get(currentRef.current.id)?.modelVersion });
      }
    };
    const onPause = () => { setIsPlaying(false); if (currentRef.current && !audio.ended && elapsedRef.current > 0) emitPlaybackEvent({ event_type: "PLAY_PAUSED", track_id: currentRef.current.id, listened_seconds: elapsedRef.current }); };
    const onEnded = () => {
      completionRef.current = true;
      if (currentRef.current) emitPlaybackEvent({ event_type: "PLAY_COMPLETED", track_id: currentRef.current.id,
        listened_seconds: elapsedRef.current, completion_ratio: audio.duration ? Math.min(1, elapsedRef.current / audio.duration) : undefined, source: sourceRef.current,
        recommendation_id: recommendationsRef.current.get(currentRef.current.id)?.recommendationId,
        model_version: recommendationsRef.current.get(currentRef.current.id)?.modelVersion });
      if (repeatRef.current === "one") { emitPlaybackEvent({ event_type: "TRACK_REPLAYED", track_id: currentRef.current?.id }); seekToStartAndPlay(); }
      else nextTrack();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      void flushPlaybackEvents();
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [nextTrack]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tracks", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Library request failed (${response.status})`);
        return response.json() as Promise<LibraryResponse>;
      })
      .then((data) => {
        tracksRef.current = data.tracks;
        queueRef.current = data.tracks;
        setQueue(data.tracks);
        setTracks(data.tracks);
        setLibraryError(data.error ?? null);
        setMusicPathConfigured(data.musicPathConfigured);
        let savedId: string | null = null;
        try { savedId = localStorage.getItem("mubo_now_playing"); } catch {}
        const initial = data.tracks.find((track) => track.id === savedId) ?? data.tracks[0] ?? null;
        if (initial) selectTrack(initial, false);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLibraryError(error instanceof Error ? error.message : "Unable to load the library.");
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [selectTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(seconds)) {
      emitPlaybackEvent({ event_type: "TRACK_SEEKED", track_id: currentRef.current?.id, context: { from: audio.currentTime, to: seconds } });
      audio.currentTime = seconds;
      lastPositionRef.current = seconds;
    }
  }, []);

  const playerValue = useMemo<PlayerContextType>(() => ({
    tracks, currentTrack, isPlaying, isLoading, libraryError, musicPathConfigured,
    playTrack: selectTrack, togglePlay,
    nextTrack, prevTrack, seek, volume, setVolume,
    queue, recommendedTrackIds, shuffleMode, repeatMode, setShuffleMode, cycleRepeat, playQueue, startRadio,
    playerOpen, openPlayer, closePlayer, likedTrackIds, toggleLike,
  }), [tracks, currentTrack, isPlaying, isLoading, libraryError, musicPathConfigured, selectTrack, togglePlay, nextTrack, prevTrack, seek, volume, setVolume, queue, recommendedTrackIds, shuffleMode, repeatMode, setShuffleMode, cycleRepeat, playQueue, startRadio, playerOpen, openPlayer, closePlayer, likedTrackIds, toggleLike]);
  const timingValue = useMemo(() => ({ currentTime, duration }), [currentTime, duration]);
  return <PlayerContext.Provider value={playerValue}><TimingContext.Provider value={timingValue}>{children}</TimingContext.Provider></PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}

export function usePlaybackTime() {
  const context = useContext(TimingContext);
  if (!context) throw new Error("usePlaybackTime must be used inside PlayerProvider");
  return context;
}
