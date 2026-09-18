"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePlaybackTime, usePlayer } from "../context/PlayerContext";
import BeatBackdrop from "./BeatBackdrop";
import styles from "./PlayerOverlay.module.css";

type IconName = "down" | "external" | "heart" | "shuffle" | "previous" | "play" | "pause" | "next" | "repeat";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    down: <path d="m5 9 7 7 7-7" />,
    external: <><path d="M7 17 17 7M8 7h9v9" /></>,
    heart: <path d="M20.8 8.2c0 4.4-8.8 10.2-8.8 10.2S3.2 12.6 3.2 8.2a4.4 4.4 0 0 1 8.8-.3 4.4 4.4 0 0 1 8.8.3Z" />,
    shuffle: <><path d="M3 7h3c5 0 7 10 12 10h3M18 14l3 3-3 3M3 17h3c2 0 3-1 4-2M15 9c1-1 2-2 3-2h3M18 4l3 3-3 3" /></>,
    previous: <><path d="M5 5v14M19 5 7 12l12 7V5Z" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>,
    next: <><path d="M19 5v14M5 5l12 7-12 7V5Z" /></>,
    repeat: <><path d="M17 3.5 20 7l-3 3.5M20 7H7a4 4 0 0 0-4 4M7 20.5 4 17l3-3.5M4 17h13a4 4 0 0 0 4-4" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill={name === "play" || name === "pause" ? "currentColor" : "none"} stroke={name === "play" || name === "pause" ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function ProgressControls({ trackDuration, seek }: { trackDuration: number | null; seek: (seconds: number) => void }) {
  const { currentTime, duration } = usePlaybackTime();
  const total = duration || trackDuration || 0;
  return <><input className={styles.progress} aria-label="Song progress" type="range" min="0" max={total || 1} value={Math.min(currentTime, total || 1)} onChange={event => seek(Number(event.target.value))} disabled={!total} style={{ "--fill": `${total ? currentTime / total * 100 : 0}%` } as React.CSSProperties} /><div className={styles.times}><span>{format(currentTime)}</span><span>{total ? format(total) : "--:--"}</span></div></>;
}

export default function PlayerOverlay() {
  const { currentTrack, isPlaying, playerOpen, closePlayer, togglePlay, nextTrack, prevTrack, seek, queue, recommendedTrackIds, shuffleMode, setShuffleMode, repeatMode, cycleRepeat, playTrack, startRadio, likedTrackIds, toggleLike } = usePlayer();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!playerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closePlayer(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; previous?.focus(); };
  }, [playerOpen, closePlayer]);
  return <div className={`${styles.layer} ${playerOpen && currentTrack ? styles.open : ""}`} aria-hidden={!playerOpen}>
    {currentTrack && <>{playerOpen && <BeatBackdrop coverImage={currentTrack.coverImage} />}
      <div className={styles.page} role="dialog" aria-modal="true" aria-label="Now playing">
        <header className={styles.header}><button ref={closeRef} type="button" onClick={closePlayer} aria-label="Collapse player"><Icon name="down" /></button><div><span>NOW PLAYING FROM YOUR LIBRARY</span><strong>{currentTrack.album}</strong></div><Link href={`/album/${currentTrack.albumId}`} onClick={closePlayer} aria-label="Open album"><Icon name="external" /></Link></header>
        <div className={styles.art}>{currentTrack.coverImage && <Image src={currentTrack.coverImage} alt={`${currentTrack.album} cover`} fill sizes="(max-width: 600px) 80vw, 440px" />}</div>
        <section className={styles.controls}>
          <div className={styles.trackHeading}><div><h1>{currentTrack.title}</h1><Link href={currentTrack.artistIds[0] ? `/artist/${currentTrack.artistIds[0]}` : "/browse/artists"} onClick={closePlayer}>{currentTrack.artist}</Link></div><button type="button" onClick={toggleLike} className={likedTrackIds.includes(currentTrack.id) ? styles.liked : ""} aria-label={likedTrackIds.includes(currentTrack.id) ? "Unlike track" : "Like track"} aria-pressed={likedTrackIds.includes(currentTrack.id)}><Icon name="heart" /></button></div>
          <ProgressControls trackDuration={currentTrack.duration} seek={seek} />
          <div className={styles.buttons}><button type="button" className={shuffleMode !== "off" ? styles.enabled : ""} onClick={() => setShuffleMode(shuffleMode === "off" ? "standard" : shuffleMode === "standard" ? "smart" : "off")} aria-label={`Shuffle: ${shuffleMode}. Click to change mode`} title={`Shuffle: ${shuffleMode}`}><Icon name="shuffle" />{shuffleMode === "smart" && <i>✦</i>}</button><button type="button" onClick={prevTrack} aria-label="Previous track"><Icon name="previous" /></button><button type="button" className={styles.play} onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}><Icon name={isPlaying ? "pause" : "play"} /></button><button type="button" onClick={nextTrack} aria-label="Next track"><Icon name="next" /></button><button type="button" className={repeatMode !== "off" ? styles.enabled : ""} onClick={cycleRepeat} aria-label={`Repeat: ${repeatMode}. Click to change mode`} title={`Repeat: ${repeatMode}`}><Icon name="repeat" />{repeatMode === "one" && <i>1</i>}</button></div>
          <div className={styles.queueHead}><div><strong>Up next</strong><span>{queue.length} songs · {shuffleMode === "smart" ? "Genre smart shuffle" : shuffleMode === "standard" ? "Standard shuffle" : "In order"}</span></div><button type="button" onClick={() => startRadio("track", currentTrack)} aria-label="Start track radio">Track radio <Icon name="external" /></button></div>
          <div className={styles.queue}>{queue.filter(item => item.id !== currentTrack.id).slice(0, 5).map(item => <button type="button" key={item.id} onClick={() => playTrack(item)}><span className={styles.queueArt}>{item.coverImage && <Image src={item.coverImage} alt="" fill sizes="36px" />}</span><span><strong>{item.title}</strong><small>{item.artist}{recommendedTrackIds.includes(item.id) ? " · ✦ Smart Shuffle" : ""}</small></span><Icon name="play" /></button>)}</div>
        </section>
      </div></>}
  </div>;
}
