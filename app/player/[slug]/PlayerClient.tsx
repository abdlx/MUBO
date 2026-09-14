"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GlassSurface from "../../components/GlassSurface";
import { tracks, type Track } from "../../data/tracks";
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
  const imageSrc = track.coverImage || (track.art === "road" ? "/afterglow-cover.png" : null);
  return (
    <div className={`${styles.coverArt} ${styles[track.art]} ${compact ? styles.compactCover : ""}`}>
      {imageSrc && <Image src={imageSrc} alt={track.title} fill priority={!compact} sizes={compact ? "120px" : "(max-width: 600px) 84vw, 520px"} />}
    </div>
  );
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function PlayerClient({ track }: { track: Track }) {
  const router = useRouter();
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(Math.min(79, track.duration));
  const bgImage = track.coverImage || (track.art === "road" ? "/afterglow-cover.png" : null);

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
    const currentIndex = tracks.findIndex((item) => item.slug === track.slug);
    const nextTrack = tracks[(currentIndex + direction + tracks.length) % tracks.length];
    router.push(`/player/${nextTrack.slug}`);
  }

  return (
    <main className={`${styles.playerShell} ${styles[`${track.art}Shell`]}`}>
      {bgImage ? (
        <Image className={styles.backgroundArt} src={bgImage} alt="" fill priority sizes="100vw" />
      ) : (
        <div className={`${styles.backgroundArt} ${styles[track.art]}`} />
      )}
      <div className={styles.backgroundWash} />

      <header className={styles.topbar}>
        <Link className={styles.iconButton} href="/" aria-label="Back to home"><Icon name="back" /></Link>
        <div className={styles.nowLabel}><span>Playing from album</span><strong>{track.album}</strong></div>
        <button className={styles.iconButton} aria-label="More options"><Icon name="more" /></button>
      </header>

      <section className={styles.artworkWrap} aria-label={`${track.title} album artwork`}>
        <div className={styles.artworkGlow} />
        <CoverArt track={track} />
        <div className={styles.artworkShine} />
      </section>

      <GlassSurface width="min(100%, 680px)" height="auto" borderRadius="var(--control-card-radius)" borderWidth={0.07} brightness={50} opacity={0.93} blur={11} displace={0} backgroundOpacity={0} saturation={1} distortionScale={-180} redOffset={0} greenOffset={10} blueOffset={20} xChannel="R" yChannel="G" mixBlendMode="difference" className={styles.glassPlayer} style={{ aspectRatio: "1.9" }}>
        <section className={styles.glassPlayerContent} aria-label="Music controls">
          <div className={styles.cardHeading}>
            <CoverArt track={track} compact />
            <div className={styles.cardCopy}><h1>{track.title}</h1><p>{track.artist}</p></div>
            <div className={styles.waveform} aria-hidden="true">{[3.45,2.55,2.95,2.2,2.4,1.7,1.25].map((height,index) => <i key={index} style={{ height: `${height}cqw` }} />)}</div>
          </div>
          <div className={styles.progressRow}>
            <span>{formatTime(progress)}</span>
            <input aria-label="Song progress" type="range" min="0" max={track.duration} value={progress} onChange={(event) => setProgress(Number(event.target.value))} style={{ "--progress": `${(progress / track.duration) * 100}%` } as React.CSSProperties} />
            <span>{formatTime(track.duration)}</span>
          </div>
          <div className={styles.mainControls}>
            <button className={`${styles.iconButton} ${styles.skip}`} onClick={() => changeTrack(-1)} aria-label="Previous track"><Icon name="previous" size={32} /></button>
            <button className={styles.playButton} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Resume"}><Icon name={playing ? "pause" : "play"} size={32} /></button>
            <button className={`${styles.iconButton} ${styles.skip}`} onClick={() => changeTrack(1)} aria-label="Next track"><Icon name="next" size={32} /></button>
          </div>
        </section>
      </GlassSurface>
    </main>
  );
}
