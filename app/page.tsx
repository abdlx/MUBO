"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "./context/PlayerContext";
import { getSkySlotForDate } from "./components/SkyBackground";
import { getAlbums, getArtists } from "./data/library";
import { getRecommendations, resolveRecommended, type HomeModule } from "./lib/recommendations";
import { emitPlaybackEvent } from "./lib/playback-events";

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

function RecommendedSection({ module, tracks, playQueue }: {
  module: HomeModule; tracks: ReturnType<typeof usePlayer>["tracks"];
  playQueue: ReturnType<typeof usePlayer>["playQueue"];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const items = useMemo(() => resolveRecommended(module.items, tracks), [module.items, tracks]);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      module.items.filter((item) => item.recommendationId).forEach((item) => emitPlaybackEvent({
        event_type: "RECOMMENDATION_IMPRESSION", track_id: item.trackId,
        surface: "home", recommendation_id: item.recommendationId,
        model_version: item.modelVersion, context: { module: module.id },
      }));
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [module]);
  if (!items.length) return null;
  return <section className="home-section" ref={sectionRef} id={`recommendation-${module.id}`}>
    <div className="section-heading"><h2>{module.title}</h2></div>
    <div className={`recent-grid recommendation-grid ${module.layout === "compact" ? "recommendation-compact" : ""}`} data-scroll-restore={`home-${module.id}`}>
      {items.map(({ track, recommendation }) => <button className="album-card" key={track.id}
        title={recommendation.explanation} onClick={() => playQueue(items.map(({ track: item }) => item), track, "off", module.items)}>
        <span className={`album-art ${track.art}`}>{track.coverImage && <Image src={track.coverImage} alt="" fill sizes="220px" />}</span>
        <strong>{track.title}</strong><small>{track.artist}</small>
      </button>)}
    </div>
  </section>;
}

export default function Home() {
  const router = useRouter();
  const { tracks, currentTrack, isPlaying, isLoading, libraryError, musicPathConfigured, playTrack, playQueue, togglePlay, openPlayer } = usePlayer();
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const greeting = getSkySlotForDate().greeting;

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
    return normalizedQuery ? result : result.slice(0, 4);
  }, [activeCategory, query, tracks]);

  const albums = useMemo(() => getAlbums(tracks), [tracks]);
  const artists = useMemo(() => getArtists(tracks), [tracks]);
  const featured = tracks[0] ?? null;

  useEffect(() => {
    if (!tracks.length) return;
    let cancelled = false;
    void getRecommendations("home", { seed_ids: currentTrack ? [currentTrack.id] : [], seed: new Date().toISOString().slice(0, 13), limit: 18 })
      .then((result) => {
        if (cancelled || !Array.isArray(result?.modules)) return;
        setModules(result.modules as HomeModule[]);
      });
    return () => { cancelled = true; };
  }, [tracks, currentTrack]);

  function chooseCategory(category: string) {
    setActiveCategory(category);
    rememberHome(query, category);
    router.push(`/browse/${category.toLowerCase()}${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <main className="home-shell" id="top">
      <div className="home-content">
        <header className="home-header">
          <div><p className="eyebrow">{greeting}</p><h1>Let&apos;s listen</h1></div>
          <span className="brand-badge" aria-label="Mubo"><Image src="/mubo-mark.svg" alt="" fill sizes="74px" /></span>
        </header>

        <div className="search-field">
          <Icon name="search" size={28} />
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); rememberHome(event.target.value, activeCategory); }} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/browse/all?q=${encodeURIComponent(query)}`); }} placeholder="Search for songs, artists, or albums" aria-label="Search for songs, artists, or albums" />
          {query && <button type="button" onClick={() => { setQuery(""); rememberHome("", activeCategory); }} aria-label="Clear search">Clear</button>}
        </div>

        <div className="category-row" aria-label="Browse categories">
          {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => chooseCategory(category)}>{category}</button>)}
        </div>

        {!query && featured && <section className="hero-card" aria-label="Featured track">
          <Image className="hero-image" src={featured.coverImage || "/afterglow-cover.png"} alt="" fill priority sizes="(max-width: 760px) 100vw, 1060px" />
          <div className="hero-scrim" />
          <div className="hero-copy">
            <p>From your library</p><h2>{featured.title}</h2><span>{featured.artist}<br />{featured.album}</span>
            <button className="hero-play" onClick={() => { if (currentTrack?.slug === featured.slug) togglePlay(); else playTrack(featured); }}>
              <span><Icon name={currentTrack?.slug === featured.slug && isPlaying ? "pause" : "play"} size={24} /></span>
              {currentTrack?.slug === featured.slug && isPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </section>}

        {!query && modules.map((module) => <RecommendedSection key={module.id} module={module} tracks={tracks} playQueue={playQueue} />)}

        <section className="home-section" id="recently-played">
          <div className="section-heading">
            <h2>{query ? `Search results (${filteredRecent.length})` : "Your Music"}</h2>
            <Link href={`/browse/songs${query ? `?q=${encodeURIComponent(query)}` : ""}`}>View all<Icon name="arrow" size={18} /></Link>
          </div>
          {filteredRecent.length ? (
            <div className="recent-grid" data-scroll-restore="home-songs">
              {filteredRecent.map((item) => (
                <div className="album-card track-card" key={item.id}>
                  <button className="track-card-main" type="button" onClick={() => { if (currentTrack?.id !== item.id) playTrack(item); openPlayer(); }} aria-label={`Open ${item.title} by ${item.artist} in the player`}>
                  <span className={`album-art ${item.art}`}>
                    {(item.coverImage || item.art === "road") && <Image src={item.coverImage || "/afterglow-cover.png"} alt={item.title} fill sizes="220px" />}
                  </span>
                  <strong>{item.title}</strong><small>{item.artist}</small>
                  </button>
                    <button
                      className="hover-play"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentTrack?.slug === item.slug) togglePlay();
                        else playTrack(item);
                      }}
                      type="button"
                      aria-label={`Play ${item.title}`}
                    >
                      <Icon name={currentTrack?.slug === item.slug && isPlaying ? "pause" : "play"} size={22} />
                    </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><Icon name="sparkle" size={24} /><p>{isLoading ? "Scanning your music library…" : !musicPathConfigured ? "Set MUSIC_PATH to your music folder, then restart Mubo." : libraryError ? `Library error: ${libraryError}` : tracks.length === 0 ? "No supported audio files were found in your music folder." : "No matches yet. Try another song or artist."}</p>{tracks.length > 0 && <button onClick={() => { setQuery(""); setActiveCategory("All"); rememberHome("", "All"); }}>Reset filters</button>}</div>
          )}
        </section>

        {!query && albums.length > 0 && <section className="home-section" id="albums">
          <div className="section-heading"><h2>Your Albums</h2><Link href="/browse/albums">View all<Icon name="arrow" size={18} /></Link></div>
          <div className="recent-grid" data-scroll-restore="home-albums">
            {albums.map((album) => <Link className="album-card" href={`/album/${album.id}`} key={album.id} aria-label={`Open ${album.title} by ${album.artist}`}>
              <span className={`album-art ${album.art}`}>{album.coverImage && <Image src={album.coverImage} alt="" fill sizes="220px" />}</span>
              <strong>{album.title}</strong><small>{album.artist}{album.year ? ` · ${album.year}` : ""}</small>
            </Link>)}
          </div>
        </section>}

        {!query && tracks.length > 0 && modules.length === 0 && <section className="home-section" id="made-for-you">
          <div className="section-heading"><h2>Quick Picks</h2><Link href="/browse/playlists">View all<Icon name="arrow" size={18} /></Link></div>
          <div className="mix-grid" data-scroll-restore="home-picks">
            {tracks.slice(0, 4).map((track, index) => <button className="mix-card" key={track.id} onClick={() => playTrack(track)}>{track.coverImage && <Image className="mix-artwork" src={track.coverImage} alt="" fill sizes="203px" />}<span className="mix-number">0{index + 1}</span><span className="mix-copy"><strong>{track.title}</strong><small>{track.artist} · {track.album}</small></span><span className="mix-arrow"><Icon name="chevron" size={16} /></span></button>)}
          </div>
        </section>}

        {!query && <section className="home-section artists-section" id="your-library">
          <div className="section-heading"><h2>Your Artists</h2><Link href="/browse/artists">View all<Icon name="arrow" size={18} /></Link></div>
          <div className="artist-row" data-scroll-restore="home-artists">
            {artists.map((artist) => <Link className="artist-card" href={`/artist/${artist.id}`} key={artist.id}><span className={`artist-avatar ${artist.art} ${artist.coverImage ? "has-image" : ""}`}>{artist.coverImage ? <Image src={artist.coverImage} alt="" fill sizes="150px" /> : <i>{artist.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</i>}</span><strong>{artist.name}</strong></Link>)}
          </div>
        </section>}
      </div>
    </main>
  );
}
