"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { LibraryResponse, Track } from "../data/tracks";

interface PlayerContextType {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  libraryError: string | null;
  musicPathConfigured: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const currentRef = useRef<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [musicPathConfigured, setMusicPathConfigured] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
    const queue = tracksRef.current;
    if (!queue.length) return;
    const index = Math.max(0, queue.findIndex((track) => track.id === currentRef.current?.id));
    selectTrack(queue[(index + 1) % queue.length], true);
  }, [selectTrack]);

  const prevTrack = useCallback(() => {
    const queue = tracksRef.current;
    if (!queue.length) return;
    const index = Math.max(0, queue.findIndex((track) => track.id === currentRef.current?.id));
    selectTrack(queue[(index - 1 + queue.length) % queue.length], true);
  }, [selectTrack]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => nextTrack();
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

  return <PlayerContext.Provider value={{
    tracks, currentTrack, isPlaying, isLoading, libraryError, musicPathConfigured,
    currentTime, duration, playTrack: selectTrack, togglePlay,
    nextTrack, prevTrack, seek,
  }}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
