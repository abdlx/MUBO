"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { tracks, type Track } from "../data/tracks";

interface PlayerContextType {
  currentTrack: Track;
  isPlaying: boolean;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track>(tracks[0]);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    try {
      const savedSlug = localStorage.getItem("mubo_now_playing");
      if (savedSlug) {
        const found = tracks.find((t) => t.slug === savedSlug);
        if (found) setCurrentTrack(found);
      }
    } catch {}
  }, []);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    try {
      localStorage.setItem("mubo_now_playing", track.slug);
    } catch {}
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const nextTrack = () => {
    const currentIndex = tracks.findIndex((t) => t.slug === currentTrack.slug);
    const next = tracks[(currentIndex + 1) % tracks.length];
    setCurrentTrack(next);
    setIsPlaying(true);
    try {
      localStorage.setItem("mubo_now_playing", next.slug);
    } catch {}
  };

  const prevTrack = () => {
    const currentIndex = tracks.findIndex((t) => t.slug === currentTrack.slug);
    const prev = tracks[(currentIndex - 1 + tracks.length) % tracks.length];
    setCurrentTrack(prev);
    setIsPlaying(true);
    try {
      localStorage.setItem("mubo_now_playing", prev.slug);
    } catch {}
  };

  return (
    <PlayerContext.Provider
      value={{ currentTrack, isPlaying, playTrack, togglePlay, nextTrack, prevTrack }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    return {
      currentTrack: tracks[0],
      isPlaying: true,
      playTrack: () => {},
      togglePlay: () => {},
      nextTrack: () => {},
      prevTrack: () => {},
    };
  }
  return context;
}
