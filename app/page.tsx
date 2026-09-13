"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import BottomDock from "./components/BottomDock";
import { tracks } from "./data/tracks";

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

const categories = ["All", "Music", "Playlists", "Artists", "Albums"];
const recentItems = tracks.map((track, index) => ({
  ...track,
  type: index === 1 || index === 3 ? "Albums" : "Music",
}));
const mixes = [
  { title: "Discover Weekly", note: "Fresh finds, picked for your ears.", art: "discover" },
  { title: "Chill Mix", note: "Laid-back color for your day.", art: "chill" },
  { title: "Late Night", note: "For when the whole world gets quiet.", art: "night" },
  { title: "Focus Flow", note: "Stay in the zone and let it unfold.", art: "focus" },
];
const artists = [
  { name: "Alex Warren", initials: "AW", art: "clay" },
  { name: "The Weeknd", initials: "TW", art: "ember" },
  { name: "SZA", initials: "SZ", art: "rose" },
  { name: "Drake", initials: "DR", art: "mono" },
  { name: "Noah Kahan", initials: "NK", art: "dusk" },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [heroPlaying, setHeroPlaying] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const filteredRecent = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = recentItems.filter((item) => {
      const categoryMatches = activeCategory === "All" || item.type === activeCategory;
      const queryMatches = !normalizedQuery || item.title.toLowerCase().includes(normalizedQuery) || item.artist.toLowerCase().includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
    return showAllRecent ? result : result.slice(0, 4);
  }, [activeCategory, query, showAllRecent]);

  return (
    <main className="home-shell" id="top">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="home-content">
        <header className="home-header">
          <div><p className="eyebrow">Good evening</p><h1>Let&apos;s listen</h1></div>
          <button className="profile" aria-label="Open profile"><Image src="/afterglow-cover.png" alt="" fill sizes="58px" /><span>A</span></button>
        </header>

        <label className="search-field">
          <Icon name="search" size={28} />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for songs, artists, or albums" aria-label="Search for songs, artists, or albums" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">Clear</button>}
        </label>

        <div className="category-row" aria-label="Browse categories">
          {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}
        </div>

        <section className="hero-card" aria-label="Featured playlist">
          <Image className="hero-image" src="/afterglow-cover.png" alt="A car driving on a coastal road at sunset" fill priority sizes="(max-width: 760px) 100vw, 1060px" />
          <div className="hero-scrim" />
          <div className="hero-copy">
            <p>For your evening</p><h2>Night Drives</h2><span>A playlist for late nights<br />and clearer thoughts.</span>
            <button className="hero-play" onClick={() => setHeroPlaying((playing) => !playing)}><span><Icon name={heroPlaying ? "pause" : "play"} size={24} /></span>{heroPlaying ? "Pause" : "Play"}</button>
          </div>
          <div className="hero-dots" aria-hidden="true"><i /><i /><i /></div>
        </section>

        <section className="home-section" id="recently-played">
          <div className="section-heading">
            <h2>Recently Played</h2>
            <button onClick={() => setShowAllRecent((current) => !current)}>{showAllRecent ? "Show less" : "See all"}<Icon name="arrow" size={18} /></button>
          </div>
          {filteredRecent.length ? (
            <div className="recent-grid">
              {filteredRecent.map((item) => (
                <Link className="album-card" href={`/player/${item.slug}`} key={item.title} aria-label={`Open ${item.title} by ${item.artist} in the player`}>
                  <span className={`album-art ${item.art}`}>{item.art === "road" && <Image src="/afterglow-cover.png" alt="" fill sizes="220px" />}<span className="hover-play"><Icon name="play" size={22} /></span></span>
                  <strong>{item.title}</strong><small>{item.artist}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state"><Icon name="sparkle" size={24} /><p>No matches yet. Try another song or artist.</p><button onClick={() => { setQuery(""); setActiveCategory("All"); }}>Reset filters</button></div>
          )}
        </section>

        <section className="home-section" id="made-for-you">
          <div className="section-heading"><h2>Made For You</h2><button>See all<Icon name="arrow" size={18} /></button></div>
          <div className="mix-grid">
            {mixes.map((mix, index) => <button className={`mix-card ${mix.art}`} key={mix.title}><span className="mix-number">0{index + 1}</span><span className="mix-copy"><strong>{mix.title}</strong><small>{mix.note}</small></span><span className="mix-arrow"><Icon name="chevron" size={16} /></span></button>)}
          </div>
        </section>

        <section className="home-section artists-section" id="your-library">
          <div className="section-heading"><h2>Your Top Artists</h2><button>See all<Icon name="arrow" size={18} /></button></div>
          <div className="artist-row">
            {artists.map((artist) => <button className="artist-card" key={artist.name}><span className={`artist-avatar ${artist.art}`}><i>{artist.initials}</i></span><strong>{artist.name}</strong></button>)}
          </div>
        </section>
      </div>
      <BottomDock />
    </main>
  );
}
