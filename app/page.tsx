"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import GlassSurface from "./components/GlassSurface";

const tracks = [
  { title: "Midnight Drive", artist: "Alex Warren", duration: 173 },
  { title: "Slow Horizons", artist: "Mira Lane", duration: 226 },
  { title: "Afterglow", artist: "Northbound", duration: 241 },
];

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    chevron: <path d="m9 18 6-6-6-6" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5a5.5 5.5 0 0 0 1.1-8.9Z" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
    shuffle: <><path d="M16 3h5v5"/><path d="m4 20 5-5"/><path d="m15 9 6-6"/><path d="M4 4l16 16"/><path d="M16 20h5v-5"/></>,
    repeat: <><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    previous: <><path d="M10 3.8Q11.8 2.8 11.8 5v14q0 2.2-1.8 1.2l-8.6-6.8Q.2 12 1.4 10.6Z" fill="currentColor" stroke="none"/><path d="M22 3.8Q23.8 2.8 23.8 5v14q0 2.2-1.8 1.2l-8.6-6.8q-1.2-1.4 0-2.8Z" fill="currentColor" stroke="none"/></>,
    next: <><path d="M2 3.8Q.2 2.8.2 5v14q0 2.2 1.8 1.2l8.6-6.8q1.2-1.4 0-2.8Z" fill="currentColor" stroke="none"/><path d="M14 3.8q-1.8-1-1.8 1.2v14q0 2.2 1.8 1.2l8.6-6.8q1.2-1.4 0-2.8Z" fill="currentColor" stroke="none"/></>,
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" strokeLinejoin="round" />,
    pause: <><rect x=".8" y=".2" width="8.3" height="23.6" rx="2" fill="currentColor" stroke="none"/><rect x="14.9" y=".2" width="8.3" height="23.6" rx="2" fill="currentColor" stroke="none"/></>,
    volume: <><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></>,
    device: <><rect x="4" y="3" width="16" height="12" rx="2"/><path d="M8 21h8M12 15v6"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></>,
  };
  const stretchToBox = name === "pause" || name === "previous" || name === "next";
  return <svg viewBox="0 0 24 24" width={size} height={size} preserveAspectRatio={stretchToBox ? "none" : undefined} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function Home() {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(79);
  const [trackIndex, setTrackIndex] = useState(0);
  const track = tracks[trackIndex];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current < track.duration) return current + 1;
        setPlaying(false);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, track.duration]);

  function changeTrack(direction: number) {
    setTrackIndex((current) => (current + direction + tracks.length) % tracks.length);
    setProgress(0);
  }

  return (
    <main className="player-shell">
      <Image className="background-art" src="/afterglow-cover.png" alt="" fill priority sizes="100vw" />
      <div className="background-wash" />
      <header className="topbar">
        <button className="icon-button back" aria-label="Go back"><Icon name="chevron" /></button>
        <div className="now-label"><span>Playing from album</span><strong>Night Drives</strong></div>
        <button className="icon-button" aria-label="More options"><Icon name="more" /></button>
      </header>
      <section className="artwork-wrap" aria-label="Album artwork">
        <div className="artwork-glow" />
        <Image className="artwork" src="/afterglow-cover.png" alt="Midnight Drive album cover" width={620} height={620} priority />
        <div className="artwork-shine" />
      </section>
      <GlassSurface
        width="min(100%, 680px)"
        height="auto"
        borderRadius="var(--control-card-radius)"
        borderWidth={0.07}
        brightness={50}
        opacity={0.93}
        blur={11}
        displace={0}
        backgroundOpacity={0}
        saturation={1}
        distortionScale={-180}
        redOffset={0}
        greenOffset={10}
        blueOffset={20}
        xChannel="R"
        yChannel="G"
        mixBlendMode="difference"
        className="glass-player"
        style={{ aspectRatio: "1.9" }}
      >
        <section className="glass-player-content" aria-label="Music controls">
          <div className="card-heading">
            <div className="card-cover-wrap">
              <Image className="card-cover" src="/afterglow-cover.png" alt="" width={120} height={120} />
            </div>
            <div className="card-copy"><h1>{track.title}</h1><p>{track.artist}</p></div>
            <div className="waveform" aria-hidden="true">
              {[3.45, 2.55, 2.95, 2.2, 2.4, 1.7, 1.25].map((height, index) => (
                <i key={index} style={{ height: `${height}cqw` }} />
              ))}
            </div>
          </div>
          <div className="progress-row">
            <span>{formatTime(progress)}</span>
            <input aria-label="Song progress" type="range" min="0" max={track.duration} value={progress} onChange={(e) => setProgress(Number(e.target.value))} style={{ "--progress": `${(progress / track.duration) * 100}%` } as React.CSSProperties} />
            <span>{formatTime(track.duration)}</span>
          </div>
          <div className="main-controls">
            <button className="icon-button skip" onClick={() => changeTrack(-1)} aria-label="Previous track"><Icon name="previous" size={32} /></button>
            <button className="play-button" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Resume"}><Icon name="pause" size={32} /></button>
            <button className="icon-button skip" onClick={() => changeTrack(1)} aria-label="Next track"><Icon name="next" size={32} /></button>
          </div>
        </section>
      </GlassSurface>
    </main>
  );
}
