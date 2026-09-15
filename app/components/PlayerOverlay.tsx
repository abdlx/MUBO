"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePlaybackTime, usePlayer } from "../context/PlayerContext";
import styles from "./PlayerOverlay.module.css";

const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function ProgressControls({ trackDuration, seek }: { trackDuration: number | null; seek: (seconds: number) => void }) {
  const { currentTime, duration } = usePlaybackTime();
  const total = duration || trackDuration || 0;
  return <><input className={styles.progress} aria-label="Song progress" type="range" min="0" max={total || 1} value={Math.min(currentTime, total || 1)} onChange={event => seek(Number(event.target.value))} disabled={!total} style={{ "--fill": `${total ? currentTime / total * 100 : 0}%` } as React.CSSProperties} /><div className={styles.times}><span>{format(currentTime)}</span><span>{total ? format(total) : "--:--"}</span></div></>;
}

export default function PlayerOverlay() {
  const { currentTrack, isPlaying, playerOpen, closePlayer, togglePlay, nextTrack, prevTrack, seek, queue, shuffleMode, setShuffleMode, repeatMode, cycleRepeat, playQueue } = usePlayer();
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
    {currentTrack && <><div className={styles.backdrop}>{currentTrack.coverImage && <Image src={currentTrack.coverImage} alt="" fill sizes="100vw" />}</div><div className={styles.wash} />
      <div className={styles.page} role="dialog" aria-modal="true" aria-label="Now playing">
        <header className={styles.header}><button ref={closeRef} onClick={closePlayer} aria-label="Collapse player">⌄</button><div><span>NOW PLAYING FROM YOUR LIBRARY</span><strong>{currentTrack.album}</strong></div><Link href={`/album/${currentTrack.albumId}`} onClick={closePlayer} aria-label="Open album">↗</Link></header>
        <div className={styles.art}>{currentTrack.coverImage && <Image src={currentTrack.coverImage} alt={`${currentTrack.album} cover`} fill sizes="(max-width: 600px) 80vw, 440px" />}</div>
        <section className={styles.controls}>
          <div className={styles.trackHeading}><div><h1>{currentTrack.title}</h1><Link href={currentTrack.artistIds[0] ? `/artist/${currentTrack.artistIds[0]}` : "/browse/artists"}>{currentTrack.artist}</Link></div><button onClick={closePlayer} aria-label="Collapse player">⌄</button></div>
          <ProgressControls trackDuration={currentTrack.duration} seek={seek} />
          <div className={styles.buttons}><button className={shuffleMode !== "off" ? styles.enabled : ""} onClick={() => setShuffleMode(shuffleMode === "off" ? "standard" : shuffleMode === "standard" ? "smart" : "off")} aria-label={`Shuffle: ${shuffleMode}. Click to change mode`} title={`Shuffle: ${shuffleMode}`}>⇄{shuffleMode === "smart" && <i>✦</i>}</button><button onClick={prevTrack} aria-label="Previous track">⏮</button><button className={styles.play} onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "Ⅱ" : "▶"}</button><button onClick={nextTrack} aria-label="Next track">⏭</button><button className={repeatMode !== "off" ? styles.enabled : ""} onClick={cycleRepeat} aria-label={`Repeat: ${repeatMode}. Click to change mode`} title={`Repeat: ${repeatMode}`}>↻{repeatMode === "one" && <i>1</i>}</button></div>
          <div className={styles.queueHead}><div><strong>Up next</strong><span>{queue.length} songs · {shuffleMode === "smart" ? "Genre smart shuffle" : shuffleMode === "standard" ? "Standard shuffle" : "In order"}</span></div><Link href="/browse/playlists" onClick={closePlayer}>View all playlists →</Link></div>
          <div className={styles.queue}>{queue.filter(item => item.id !== currentTrack.id).slice(0, 5).map(item => <button key={item.id} onClick={() => playQueue(queue, item, shuffleMode)}><span className={styles.queueArt}>{item.coverImage && <Image src={item.coverImage} alt="" fill sizes="36px" />}</span><span><strong>{item.title}</strong><small>{item.artist}</small></span><span>▶</span></button>)}</div>
        </section>
      </div></>}
  </div>;
}
