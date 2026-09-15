"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import BackButton from "./BackButton";
import { usePlayer } from "../context/PlayerContext";
import { getAlbums, getArtists } from "../data/library";
import type { Track } from "../data/tracks";
import styles from "./BrowseClient.module.css";

const kinds = ["all", "songs", "albums", "artists", "genres", "playlists"] as const;
const formatTime = (value: number | null) => value ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}` : "";
function randomStart(items: Track[]) { return items[Math.floor(Math.random() * items.length)]; }

export default function BrowseClient({ kind }: { kind: string }) {
  const { tracks, currentTrack, isPlaying, isLoading, playQueue, togglePlay, openPlayer, startRadio } = usePlayer();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const selectedGenre = searchParams.get("genre");
  const selectedPlaylist = searchParams.get("playlist");
  const sort = searchParams.get("sort") ?? "title";
  function updateBrowse(values: Record<string, string | null>, push = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) { if (value) params.set(key, value); else params.delete(key); }
    const url = `${window.location.pathname}${params.size ? `?${params}` : ""}`;
    if (push) {
      document.dispatchEvent(new Event("mubo:before-push"));
      window.history.pushState({ ...(window.history.state ?? {}), muboScrollId: crypto.randomUUID() }, "", url);
      document.dispatchEvent(new Event("mubo:after-push"));
    } else window.history.replaceState(window.history.state, "", url);
  }
  const activeKind = kinds.includes(kind as typeof kinds[number]) ? kind : "all";
  const normalized = query.trim().toLowerCase();
  const matching = useMemo(() => tracks.filter(track => !normalized || [track.title, track.artist, track.album, ...track.artists, ...track.genres].some(value => value.toLowerCase().includes(normalized))), [tracks, normalized]);
  const albums = useMemo(() => getAlbums(matching), [matching]);
  const artists = useMemo(() => getArtists(matching), [matching]);
  const genres = useMemo(() => [...new Set(tracks.flatMap(track => track.genres))].sort((a, b) => a.localeCompare(b)), [tracks]);
  const playlists = useMemo(() => [{ name: "All Songs", items: tracks }, { name: "Recently Added", items: [...tracks].reverse() }, ...genres.map(name => ({ name: `${name} Mix`, items: tracks.filter(track => track.genres.includes(name)) }))], [tracks, genres]);
  const selected = selectedPlaylist ? playlists.find(item => item.name === selectedPlaylist)?.items ?? [] : selectedGenre ? tracks.filter(track => track.genres.includes(selectedGenre)) : matching;
  const displayed = [...selected].filter(track => !normalized || [track.title, track.artist, track.album].some(value => value.toLowerCase().includes(normalized))).sort((a, b) => sort === "artist" ? a.artist.localeCompare(b.artist) : sort === "album" ? a.album.localeCompare(b.album) : a.title.localeCompare(b.title));
  const title = selectedPlaylist ?? selectedGenre ?? ({ all: "Your Library", songs: "Songs", albums: "Albums", artists: "Artists", genres: "Genres", playlists: "Playlists" }[activeKind] || "Your Library");

  function play(item: Track, items: Track[] = displayed) { if (currentTrack?.id === item.id) togglePlay(); else playQueue(items, item); }
  function shuffle(mode: "standard" | "smart") { const items = displayed.length ? displayed : selected; if (items.length) playQueue(items, randomStart(items), mode); }

  return <main className={styles.shell}>
    <div className={styles.content}>
      <header className={styles.header}><BackButton className={styles.back} ariaLabel="Go back">‹</BackButton><div><p className={styles.eyebrow}>Mubo · Explore</p><h1>{title}</h1><span>{selectedPlaylist || selectedGenre ? `${selected.length} songs` : "Everything in your music library"}</span></div></header>
      <label className={styles.search}><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={event => updateBrowse({ q: event.target.value }, false)} placeholder="Search songs, artists, albums, and genres" autoFocus={activeKind === "all"} aria-label="Search your library" />{query && <button onClick={() => updateBrowse({ q: null }, false)} aria-label="Clear search">×</button>}</label>
      <nav className={styles.tabs} aria-label="Browse categories" data-scroll-restore="browse-tabs">{kinds.map(item => <Link key={item} className={item === activeKind ? styles.activeTab : ""} href={`/browse/${item}`}>{item[0].toUpperCase() + item.slice(1)}</Link>)}</nav>
      {isLoading && <p className={styles.empty}>Reading your music library…</p>}
      {!isLoading && !tracks.length && <p className={styles.empty}>No music found. Set MUSIC_PATH to your music folder to browse here.</p>}
      {(activeKind === "all" || activeKind === "genres") && !selectedGenre && !selectedPlaylist && genres.length > 0 && <section className={styles.section}><div className={styles.sectionHead}><h2>Genres</h2>{activeKind === "all" && <Link href="/browse/genres">View all →</Link>}</div><div className={styles.genreGrid}>{genres.filter(name => !normalized || name.toLowerCase().includes(normalized)).map((name, index) => <button className={styles.genre} style={{ "--hue": `${(index * 47 + 300) % 360}` } as React.CSSProperties} key={name} onClick={() => updateBrowse({ genre: name, playlist: null })}><strong>{name}</strong><span>{tracks.filter(track => track.genres.includes(name)).length} songs</span></button>)}</div></section>}
      {(activeKind === "all" || activeKind === "playlists") && !selectedGenre && !selectedPlaylist && <section className={styles.section}><div className={styles.sectionHead}><h2>Playlists</h2>{activeKind === "all" && <Link href="/browse/playlists">View all →</Link>}</div><div className={styles.genreGrid}>{playlists.filter(item => !normalized || item.name.toLowerCase().includes(normalized)).map((item, index) => <button className={styles.genre} style={{ "--hue": `${(index * 53 + 210) % 360}` } as React.CSSProperties} key={item.name} onClick={() => updateBrowse({ playlist: item.name, genre: null })}><strong>{item.name}</strong><span>{item.items.length} songs</span></button>)}</div></section>}
      {(activeKind === "all" || activeKind === "artists") && !selectedGenre && !selectedPlaylist && <section className={styles.section}><div className={styles.sectionHead}><h2>Artists</h2>{activeKind === "all" && <Link href="/browse/artists">View all →</Link>}</div><div className={styles.cardGrid}>{artists.map(item => <Link className={styles.card} href={`/artist/${item.id}`} key={item.id}><div className={`${styles.cover} ${styles.round}`} data-art={item.art}>{item.coverImage && <Image src={item.coverImage} alt="" fill sizes="180px" />}</div><strong>{item.name}</strong><small>{item.trackCount} songs</small></Link>)}</div></section>}
      {(activeKind === "all" || activeKind === "albums") && !selectedGenre && !selectedPlaylist && <section className={styles.section}><div className={styles.sectionHead}><h2>Albums</h2>{activeKind === "all" && <Link href="/browse/albums">View all →</Link>}</div><div className={styles.cardGrid}>{albums.map(item => <Link className={styles.card} href={`/album/${item.id}`} key={item.id}><div className={styles.cover} data-art={item.art}>{item.coverImage && <Image src={item.coverImage} alt="" fill sizes="180px" />}</div><strong>{item.title}</strong><small>{item.artist} · {item.trackCount} songs</small></Link>)}</div></section>}
      {(activeKind === "all" || activeKind === "songs" || selectedGenre || selectedPlaylist) && <section className={styles.section}><div className={styles.sectionHead}><h2>{selectedPlaylist || selectedGenre ? "Tracklist" : "Songs"}</h2>{activeKind === "all" && !selectedGenre && !selectedPlaylist && <Link href="/browse/songs">View all →</Link>}</div><div className={styles.actions}>{selectedGenre && <button onClick={() => updateBrowse({ genre: null })}>← All genres</button>}{selectedPlaylist && <button onClick={() => updateBrowse({ playlist: null })}>← All playlists</button>}{displayed.length > 1 && <><button onClick={() => shuffle(selectedGenre ? "smart" : "standard")}>{selectedGenre ? "✦ Smart shuffle" : "⇄ Shuffle"}</button>{selectedGenre && <button onClick={() => shuffle("standard")}>⇄ Standard shuffle</button>}{selectedPlaylist && <button onClick={() => startRadio("playlist", displayed[0], displayed)}>✦ Playlist radio</button>}</>}<select aria-label="Sort songs" value={sort} onChange={event => updateBrowse({ sort: event.target.value })}><option value="title">Title</option><option value="artist">Artist</option><option value="album">Album</option></select></div><div className={styles.songList}>{displayed.map((item, index) => <div className={`${styles.song} ${currentTrack?.id === item.id ? styles.playing : ""}`} key={item.id}><button className={styles.songMain} onClick={() => play(item)}><span className={styles.number}>{currentTrack?.id === item.id && isPlaying ? "♫" : index + 1}</span><span className={styles.songCover} data-art={item.art}>{item.coverImage && <Image src={item.coverImage} alt="" fill sizes="46px" />}</span><span className={styles.songCopy}><strong>{item.title}</strong><small>{item.artist}</small></span></button><Link href={`/album/${item.albumId}`} className={styles.albumName}>{item.album}</Link><span className={styles.time}>{formatTime(item.duration)}</span><button className={styles.open} onClick={() => { if (currentTrack?.id !== item.id) playQueue(displayed, item); openPlayer(); }} aria-label={`Open ${item.title} in player`}>↗</button></div>)}</div>{!displayed.length && <p className={styles.empty}>No matching songs.</p>}</section>}
    </div>
  </main>;
}
