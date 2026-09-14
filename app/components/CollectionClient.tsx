"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { usePlayer } from "../context/PlayerContext";
import { getAlbums } from "../data/library";
import type { Track } from "../data/tracks";
import styles from "./CollectionClient.module.css";

type CollectionKind = "album" | "artist";

function PlayIcon({ pause = false }: { pause?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{pause ? <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></> : <path d="M8 5v14l11-7L8 5Z" />}</svg>;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function Cover({ track, round = false }: { track: Track; round?: boolean }) {
  return <div className={`${styles.cover} ${round ? styles.roundCover : ""}`} data-art={track.art}>
    {track.coverImage && <Image src={track.coverImage} alt="" fill priority sizes="(max-width: 600px) 56vw, 280px" />}
  </div>;
}

export default function CollectionClient({ kind, id }: { kind: CollectionKind; id: string }) {
  const { tracks, currentTrack, isPlaying, isLoading, playTrack, togglePlay } = usePlayer();
  const collectionTracks = useMemo(() => tracks.filter((track) => kind === "album" ? track.albumId === id : track.artistIds.includes(id)), [tracks, kind, id]);
  const albums = useMemo(() => kind === "artist" ? getAlbums(collectionTracks) : [], [collectionTracks, kind]);

  if (isLoading) return <main className={styles.shell}><div className={styles.message}>Reading your library…</div></main>;
  if (!collectionTracks.length) return <main className={styles.shell}><div className={styles.message}><p>This {kind} is no longer in the library.</p><Link href="/">Back to Mubo</Link></div></main>;

  const representative = collectionTracks.find((track) => track.coverImage) ?? collectionTracks[0];
  const artistIndex = representative.artistIds.indexOf(id);
  const title = kind === "album" ? representative.album : representative.artists[artistIndex] ?? representative.artist;
  const subtitle = kind === "album"
    ? `${representative.albumArtist}${representative.year ? ` · ${representative.year}` : ""}`
    : `${albums.length} ${albums.length === 1 ? "album" : "albums"} · ${collectionTracks.length} ${collectionTracks.length === 1 ? "song" : "songs"}`;
  const firstTrack = collectionTracks[0];
  const collectionPlaying = isPlaying && collectionTracks.some((track) => track.id === currentTrack?.id);

  function playCollection() {
    if (collectionPlaying) togglePlay();
    else playTrack(firstTrack);
  }

  return <main className={styles.shell}>
    {representative.coverImage && <Image className={styles.backdrop} src={representative.coverImage} alt="" fill priority sizes="100vw" />}
    <div className={styles.wash} />
    <div className={styles.content}>
      <header className={styles.topbar}><Link href="/" aria-label="Back to home"><span>‹</span></Link><strong>Mubo</strong><i /></header>
      <section className={styles.hero}>
        <Cover track={representative} round={kind === "artist"} />
        <div className={styles.heroCopy}><p>{kind}</p><h1>{title}</h1><span>{subtitle}</span>{representative.genres.length > 0 && <small>{representative.genres.slice(0, 3).join(" · ")}</small>}
          <button className={styles.playAll} onClick={playCollection}><PlayIcon pause={collectionPlaying} />{collectionPlaying ? "Pause" : "Play"}</button>
        </div>
      </section>

      {kind === "artist" && albums.length > 0 && <section className={styles.section}>
        <h2>Albums</h2><div className={styles.albumGrid}>{albums.map((album) => <Link href={`/album/${album.id}`} className={styles.albumCard} key={album.id}>
          <div className={styles.albumCover} data-art={album.art}>{album.coverImage && <Image src={album.coverImage} alt="" fill sizes="180px" />}</div>
          <strong>{album.title}</strong><span>{album.year ?? album.artist}</span>
        </Link>)}</div>
      </section>}

      <section className={styles.section}>
        <h2>{kind === "album" ? "Tracklist" : "Songs"}</h2>
        <div className={styles.trackList}>{collectionTracks.map((track, index) => {
          const active = currentTrack?.id === track.id;
          return <div className={`${styles.trackRow} ${active ? styles.activeTrack : ""}`} key={track.id}>
            <button className={styles.trackMain} onClick={() => active ? togglePlay() : playTrack(track)} aria-label={`${active && isPlaying ? "Pause" : "Play"} ${track.title}`}>
              <span className={styles.trackNumber}>{active ? <PlayIcon pause={isPlaying} /> : track.trackNumber ?? index + 1}</span>
              <span className={styles.trackCopy}><strong>{track.title}</strong><small>{track.artist}</small></span>
            </button>
            {kind === "artist" && <Link className={styles.rowAlbum} href={`/album/${track.albumId}`}>{track.album}</Link>}
            <span className={styles.duration}>{formatDuration(track.duration)}</span>
          </div>;
        })}</div>
      </section>
    </div>
  </main>;
}
