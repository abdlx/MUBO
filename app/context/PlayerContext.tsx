"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryResponse, Track } from "../data/tracks";

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
  shuffleMode: "off" | "standard" | "smart";
  repeatMode: "off" | "all" | "one";
  setShuffleMode: (mode: "off" | "standard" | "smart") => void;
  cycleRepeat: () => void;
  playQueue: (queue: Track[], start?: Track, mode?: "off" | "standard" | "smart") => void;
  playerOpen: boolean;
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
  const [shuffleMode, updateShuffleMode] = useState<"off" | "standard" | "smart">("off");
  const [repeatMode, updateRepeatMode] = useState<"off" | "all" | "one">("off");
  const [playerOpen, setPlayerOpen] = useState(false);
  const openPlayer = useCallback(() => setPlayerOpen(true), []);
  const closePlayer = useCallback(() => setPlayerOpen(false), []);
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
  }, []);
  const cycleRepeat = useCallback(() => {
    const next = repeatRef.current === "off" ? "all" : repeatRef.current === "all" ? "one" : "off";
    repeatRef.current = next;
    updateRepeatMode(next);
  }, []);

  const selectTrack = useCallback((track: Track, shouldPlay = true) => {
    const audio = audioRef.current;
    currentRef.current = track;
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
      const pool = available.length ? available : candidates.filter((track) => track.id !== current?.id);
      if (!available.length) historyRef.current = [];
      if (shuffleRef.current === "smart" && current) {
        const shared = pool.filter((track) => track.genres.some((genre) => current.genres.some((value) => value.toLowerCase() === genre.toLowerCase())));
        next = (shared.length ? shared : pool)[Math.floor(Math.random() * (shared.length ? shared : pool).length)];
      } else next = pool[Math.floor(Math.random() * pool.length)];
    }
    if (next) { if (current) historyRef.current.push(current.id); selectTrack(next, true); }
    else audioRef.current?.pause();
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

  const playQueue = useCallback((items: Track[], start?: Track, mode: "off" | "standard" | "smart" = "off") => {
    if (!items.length) return;
    queueRef.current = items;
    setQueue(items);
    historyRef.current = [];
    setShuffleMode(mode);
    selectTrack(start ?? items[0], true);
  }, [selectTrack, setShuffleMode]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { if (repeatRef.current === "one") seekToStartAndPlay(); else nextTrack(); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
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
    if (audio && Number.isFinite(seconds)) audio.currentTime = seconds;
  }, []);

  const playerValue = useMemo<PlayerContextType>(() => ({
    tracks, currentTrack, isPlaying, isLoading, libraryError, musicPathConfigured,
    playTrack: selectTrack, togglePlay,
    nextTrack, prevTrack, seek, volume, setVolume,
    queue, shuffleMode, repeatMode, setShuffleMode, cycleRepeat, playQueue,
    playerOpen, openPlayer, closePlayer,
  }), [tracks, currentTrack, isPlaying, isLoading, libraryError, musicPathConfigured, selectTrack, togglePlay, nextTrack, prevTrack, seek, volume, setVolume, queue, shuffleMode, repeatMode, setShuffleMode, cycleRepeat, playQueue, playerOpen, openPlayer, closePlayer]);
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
