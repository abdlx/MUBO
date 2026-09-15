"use client";

import { usePlaybackTime, usePlayer } from "../context/PlayerContext";
import styles from "./DesktopTransport.module.css";

const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function DesktopTransport() {
  const { currentTrack, isPlaying, togglePlay, prevTrack, nextTrack, seek, shuffleMode, setShuffleMode, repeatMode, cycleRepeat, volume, setVolume, openPlayer } = usePlayer();
  const { currentTime, duration } = usePlaybackTime();
  const total = duration || currentTrack?.duration || 0;
  return <div className={styles.transport} aria-label="Desktop playback controls">
    <div className={styles.center}>
      <div className={styles.controls}>
        <button className={shuffleMode !== "off" ? styles.on : ""} onClick={() => setShuffleMode(shuffleMode === "off" ? "standard" : shuffleMode === "standard" ? "smart" : "off")} aria-label={`Shuffle: ${shuffleMode}`} title={`Shuffle: ${shuffleMode}`}>⇄</button>
        <button onClick={prevTrack} aria-label="Previous track">⏮</button>
        <button className={styles.play} onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} disabled={!currentTrack}>{isPlaying ? "Ⅱ" : "▶"}</button>
        <button onClick={nextTrack} aria-label="Next track">⏭</button>
        <button className={repeatMode !== "off" ? styles.on : ""} onClick={cycleRepeat} aria-label={`Repeat: ${repeatMode}`} title={`Repeat: ${repeatMode}`}>↻</button>
      </div>
      <div className={styles.progress}><span>{format(currentTime)}</span><input aria-label="Song progress" type="range" min="0" max={total || 1} value={Math.min(currentTime, total || 1)} onChange={event => seek(Number(event.target.value))} disabled={!total} style={{ "--fill": `${total ? currentTime / total * 100 : 0}%` } as React.CSSProperties} /><span>{total ? format(total) : "--:--"}</span></div>
    </div>
    <div className={styles.extras}><button onClick={openPlayer} disabled={!currentTrack} aria-label="Open full player" title="Open full player">▣</button><span aria-hidden="true">◖</span><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => setVolume(Number(event.target.value))} /></div>
  </div>;
}
