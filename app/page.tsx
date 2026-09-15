"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "./context/PlayerContext";
import BottomDock from "./components/BottomDock";
import SkyBackground, { getSkySlotForDate } from "./components/SkyBackground";
import { getAlbums, getArtists } from "./data/library";

type IconName = "arrow" | "chevron" | "pause" | "play" | "search" | "sparkle";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    chevron: <path d="m8 4 8 8-8 8" />,
    pause: <><rect x="7" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>,
    play: <path d="m9 6 10 6-10 6V6Z" fill="currentColor" stroke="none" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16.2 16.2 4.3 4.3" /></>,
    sparkle: <><path d="M12 2.8c.7 4.3 2.9 6.5 7.2 7.2-4.3.7-6.5 2.9-7.2 7.2-.7-4.3-2.9-6.5-7.2-7.2 4.3-.7 6.5-2.9 7.2-7.2Z" /><path d="M19 17.5c.25 1.6 1.05 2.4 2.5 2.5-1.45.1-2.25.9-2.5 2.5-.25-1.6-1.05-2.4-2.5-2.5 1.45-.1 2.25-.9 2.5-2.5Z" /></>,
  };

  return <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width={size}>{paths[name]}</svg>;
}

const categories = ["All", "Songs", "Albums", "Artists"];
const mixes = [
  { title: "Discover Weekly", note: "Fresh finds, picked for your ears.", art: "discover" },
  { title: "Chill Mix", note: "Laid-back color for your day.", art: "chill" },
  { title: "Late Night", note: "For when the whole world gets quiet.", art: "night" },
  { title: "Focus Flow", note: "Stay in the zone and let it unfold.", art: "focus" },
];
export default function Home() {
  const router = useRouter();
  const { tracks, currentTrack, isPlaying, isLoading, libraryError, musicPathConfigured, playTrack, togglePlay, openPlayer } = usePlayer();
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [greeting, setGreeting] = useState(() => getSkySlotForDate().greeting);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get("q") ?? "");
      setActiveCategory(params.get("category") ?? "All");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function rememberHome(nextQuery: string, nextCategory: string) {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextCategory !== "All") params.set("category", nextCategory);
    window.history.replaceState(window.history.state, "", `/${params.size ? `?${params}` : ""}`);
  }

  const filteredRecent = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = tracks.filter((item) => {
      const fields = activeCategory === "Songs" ? [item.title] : activeCategory === "Albums" ? [item.album, item.albumArtist] : activeCategory === "Artists" ? item.artists : [item.title, ...item.artists, item.album, item.albumArtist];
      return !normalizedQuery || fields.some((field) => field.toLowerCase().includes(normalizedQuery));
    });
    return result.slice(0, 4);
  }, [activeCategory, query, tracks]);

  const albums = useMemo(() => getAlbums(tracks), [tracks]);
  const artists = useMemo(() => getArtists(tracks), [tracks]);
  const featured = tracks[0] ?? null;

  function chooseCategory(category: string) {
    setActiveCategory(category);
    rememberHome(query, category);
    router.push(`/browse/${category.toLowerCase()}`);
  }

  return (
    <main className="home-shell" id="top">
      <SkyBackground onSlotChange={(slot) => setGreeting(slot.greeting)} />
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="home-content">
        <header className="home-header">
          <div><p className="eyebrow">{greeting}</p><h1>Let&apos;s listen</h1></div>
          <button className="profile" aria-label="Open profile"><Image src="/afterglow-cover.png" alt="" fill sizes="58px" /><span>A</span></button>
        </header>

        <label className="search-field">
          <Icon name="search" size={28} />
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); rememberHome(event.target.value, activeCategory); }} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/browse/all?q=${encodeURIComponent(query)}`); }} placeholder="Search for songs, artists, or albums" aria-label="Search for songs, artists, or albums" />
          {query && <button type="button" onClick={() => { setQuery(""); rememberHome("", activeCategory); }} aria-label="Clear search">Clear</button>}
        </label>

        <div className="category-row" aria-label="Browse categories">
          {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => chooseCategory(category)}>{category}</button>)}
        </div>

        {featured && <section className="hero-card" aria-label="Featured track">
          <Image className="hero-image" src={featured.coverImage || "/afterglow-cover.png"} alt="" fill priority sizes="(max-width: 760px) 100vw, 1060px" />
          <div className="hero-scrim" />
          <div className="hero-copy">
            <p>From your library</p><h2>{featured.title}</h2><span>{featured.artist}<br />{featured.album}</span>
            <button className="hero-play" onClick={() => { if (currentTrack?.slug === featured.slug) togglePlay(); else playTrack(featured); }}>
              <span><Icon name={currentTrack?.slug === featured.slug && isPlaying ? "pause" : "play"} size={24} /></span>
              {currentTrack?.slug === featured.slug && isPlaying ? "Pause" : "Play"}
            </button>
          </div>
          <div className="hero-dots" aria-hidden="true"><i /><i /><i /></div>
        </section>}

        <section className="home-section" id="recently-played">
          <div className="section-heading">
            <h2>Your Music</h2>
            <Link href="/browse/songs">View all<Icon name="arrow" size={18} /></Link>
          </div>
          {filteredRecent.length ? (
            <div className="recent-grid" data-scroll-restore="home-songs">
              {filteredRecent.map((item) => (
                <Link className="album-card" href={`/player/${item.slug}`} onClick={(event) => { event.preventDefault(); if (currentTrack?.id !== item.id) playTrack(item); openPlayer(); }} key={item.title} aria-label={`Open ${item.title} by ${item.artist} in the player`}>
                  <span className={`album-art ${item.art}`}>
                    {(item.coverImage || item.art === "road") && <Image src={item.coverImage || "/afterglow-cover.png"} alt={item.title} fill sizes="220px" />}
                    <span
                      className="hover-play"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentTrack?.slug === item.slug) togglePlay();
                        else playTrack(item);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Play ${item.title}`}
                    >
                      <Icon name={currentTrack?.slug === item.slug && isPlaying ? "pause" : "play"} size={22} />
                    </span>
                  </span>
                  <strong>{item.title}</strong><small>{item.artist}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state"><Icon name="sparkle" size={24} /><p>{isLoading ? "Scanning your music library…" : !musicPathConfigured ? "Set MUSIC_PATH to your music folder, then restart Mubo." : libraryError ? `Library error: ${libraryError}` : tracks.length === 0 ? "No supported audio files were found in your music folder." : "No matches yet. Try another song or artist."}</p>{tracks.length > 0 && <button onClick={() => { setQuery(""); setActiveCategory("All"); rememberHome("", "All"); }}>Reset filters</button>}</div>
          )}
        </section>

        {albums.length > 0 && <section className="home-section" id="albums">
          <div className="section-heading"><h2>Your Albums</h2><Link href="/browse/albums">View all<Icon name="arrow" size={18} /></Link></div>
          <div className="recent-grid" data-scroll-restore="home-albums">
            {albums.map((album) => <Link className="album-card" href={`/album/${album.id}`} key={album.id} aria-label={`Open ${album.title} by ${album.artist}`}>
              <span className={`album-art ${album.art}`}>{album.coverImage && <Image src={album.coverImage} alt="" fill sizes="220px" />}</span>
              <strong>{album.title}</strong><small>{album.artist}{album.year ? ` · ${album.year}` : ""}</small>
            </Link>)}
          </div>
        </section>}

        {tracks.length > 0 && <section className="home-section" id="made-for-you">
          <div className="section-heading"><h2>Quick Picks</h2><Link href="/browse/playlists">View all<Icon name="arrow" size={18} /></Link></div>
          <div className="mix-grid" data-scroll-restore="home-picks">
            {mixes.slice(0, tracks.length).map((mix, index) => <button className={`mix-card ${mix.art}`} key={tracks[index].id} onClick={() => playTrack(tracks[index])}><span className="mix-number">0{index + 1}</span><span className="mix-copy"><strong>{tracks[index].title}</strong><small>{tracks[index].artist} · {tracks[index].album}</small></span><span className="mix-arrow"><Icon name="chevron" size={16} /></span></button>)}
          </div>
        </section>}

        <section className="home-section artists-section" id="your-library">
          <div className="section-heading"><h2>Your Artists</h2><Link href="/browse/artists">View all<Icon name="arrow" size={18} /></Link></div>
          <div className="artist-row" data-scroll-restore="home-artists">
            {artists.map((artist) => <Link className="artist-card" href={`/artist/${artist.id}`} key={artist.id}><span className={`artist-avatar ${artist.art} ${artist.coverImage ? "has-image" : ""}`}>{artist.coverImage ? <Image src={artist.coverImage} alt="" fill sizes="150px" /> : <i>{artist.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</i>}</span><strong>{artist.name}</strong></Link>)}
          </div>
        </section>
      </div>
      <BottomDock />
    </main>
  );
}
