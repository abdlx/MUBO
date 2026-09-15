"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import GlassSurface from "../../components/GlassSurface";
import { usePlayer } from "../../context/PlayerContext";
import type { Track } from "../../data/tracks";
import styles from "./player.module.css";

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    previous: <><path d="M10 3.8Q11.8 2.8 11.8 5v14q0 2.2-1.8 1.2l-8.6-6.8Q.2 12 1.4 10.6Z" fill="currentColor" stroke="none" /><path d="M22 3.8Q23.8 2.8 23.8 5v14q0 2.2-1.8 1.2l-8.6-6.8q-1.2-1.4 0-2.8Z" fill="currentColor" stroke="none" /></>,
    next: <><path d="M2 3.8Q.2 2.8.2 5v14q0 2.2 1.8 1.2l8.6-6.8q1.2-1.4 0-2.8Z" fill="currentColor" stroke="none" /><path d="M14 3.8q-1.8-1-1.8 1.2v14q0 2.2 1.8 1.2l8.6-6.8q1.2-1.4 0-2.8Z" fill="currentColor" stroke="none" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
    pause: <><rect x="1" y=".2" width="8.2" height="23.6" rx="2" fill="currentColor" stroke="none" /><rect x="14.8" y=".2" width="8.2" height="23.6" rx="2" fill="currentColor" stroke="none" /></>,
  };
  const stretch = name === "pause" || name === "previous" || name === "next";
  return <svg viewBox="0 0 24 24" width={size} height={size} preserveAspectRatio={stretch ? "none" : undefined} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function CoverArt({ track, compact = false }: { track: Track; compact?: boolean }) {
  return <div className={`${styles.coverArt} ${styles[track.art]} ${compact ? styles.compactCover : ""}`}>
    {track.coverImage && <Image src={track.coverImage} alt={track.title} fill priority={!compact} sizes={compact ? "120px" : "(max-width: 600px) 84vw, 520px"} />}
  </div>;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function PlayerClient({ slug }: { slug: string }) {
  const { tracks, currentTrack, isPlaying, isLoading, currentTime, duration, playTrack, togglePlay, seek, nextTrack, prevTrack, shuffleMode, setShuffleMode, repeatMode, cycleRepeat } = usePlayer();
  const routeTrack = tracks.find((item) => item.slug === slug) ?? null;

  useEffect(() => {
    if (routeTrack) playTrack(routeTrack);
  }, [routeTrack, playTrack]);

  if (isLoading) return <main className={styles.playerShell}><div className={styles.playerMessage}>Loading your library…</div></main>;
  if (!routeTrack) return <main className={styles.playerShell}><div className={styles.playerMessage}><p>This track is no longer in the library.</p><Link href="/">Back to Mubo</Link></div></main>;

  const track = currentTrack ?? routeTrack;
  const total = duration || track.duration || 0;
  function changeTrack(direction: number) {
    if (direction > 0) nextTrack(); else prevTrack();
  }

  return <main className={`${styles.playerShell} ${styles[`${track.art}Shell`]}`}>
    {track.coverImage ? <Image className={styles.backgroundArt} src={track.coverImage} alt="" fill priority sizes="100vw" /> : <div className={`${styles.backgroundArt} ${styles[track.art]}`} />}
    <div className={styles.backgroundWash} />
    <header className={styles.topbar}>
      <Link className={styles.iconButton} href="/" aria-label="Back to home"><Icon name="back" /></Link>
      <div className={styles.nowLabel}><span>Playing from album</span><strong>{track.album}</strong></div>
      <button className={styles.iconButton} aria-label="More options"><Icon name="more" /></button>
    </header>
    <section className={styles.artworkWrap} aria-label={`${track.title} album artwork`}><div className={styles.artworkGlow} /><CoverArt track={track} /><div className={styles.artworkShine} /></section>
    <GlassSurface width="min(100%, 680px)" height="auto" borderRadius="var(--control-card-radius)" borderWidth={0.07} brightness={50} opacity={0.93} blur={11} displace={0} backgroundOpacity={0} saturation={1} distortionScale={-180} redOffset={0} greenOffset={10} blueOffset={20} xChannel="R" yChannel="G" mixBlendMode="difference" className={styles.glassPlayer} style={{ aspectRatio: "1.9" }}>
      <section className={styles.glassPlayerContent} aria-label="Music controls">
        <div className={styles.cardHeading}><CoverArt track={track} compact /><div className={styles.cardCopy}><h1>{track.title}</h1><p>{track.artist}</p></div><div className={styles.waveform} aria-hidden="true">{[3.45,2.55,2.95,2.2,2.4,1.7,1.25].map((height,index) => <i key={index} style={{ height: `${height}cqw` }} />)}</div></div>
        <div className={styles.progressRow}>
          <span>{formatTime(currentTime)}</span>
          <input aria-label="Song progress" type="range" min="0" max={total || 1} value={Math.min(currentTime, total || 1)} disabled={!total} onChange={(event) => seek(Number(event.target.value))} style={{ "--progress": `${total ? (currentTime / total) * 100 : 0}%` } as React.CSSProperties} />
          <span>{total ? formatTime(total) : "--:--"}</span>
        </div>
        <div className={styles.mainControls}>
          <button className={`${styles.iconButton} ${styles.mode} ${shuffleMode !== "off" ? styles.modeActive : ""}`} onClick={() => setShuffleMode(shuffleMode === "off" ? "standard" : shuffleMode === "standard" ? "smart" : "off")} aria-label={`Shuffle: ${shuffleMode}. Click to change mode`} title={`Shuffle: ${shuffleMode}`}>⇄{shuffleMode === "smart" ? "✦" : ""}</button>
          <button className={`${styles.iconButton} ${styles.skip}`} onClick={() => changeTrack(-1)} aria-label="Previous track"><Icon name="previous" size={32} /></button>
          <button className={styles.playButton} onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}><Icon name={isPlaying ? "pause" : "play"} size={32} /></button>
          <button className={`${styles.iconButton} ${styles.skip}`} onClick={() => changeTrack(1)} aria-label="Next track"><Icon name="next" size={32} /></button>
          <button className={`${styles.iconButton} ${styles.mode} ${repeatMode !== "off" ? styles.modeActive : ""}`} onClick={cycleRepeat} aria-label={`Repeat: ${repeatMode}. Click to change mode`} title={`Repeat: ${repeatMode}`}>↻{repeatMode === "one" ? "¹" : ""}</button>
        </div>
      </section>
    </GlassSurface>
  </main>;
}
