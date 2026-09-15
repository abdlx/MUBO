"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import GlassSurface from "./GlassSurface";
import { usePlayer } from "../context/PlayerContext";
import styles from "./BottomDock.module.css";

type DockItem = "home" | "new" | "radio" | "library";

function DockIcon({ name }: { name: DockItem | "search" }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M3.2 14.1 16 3.5l12.8 10.6v14.1a1.7 1.7 0 0 1-1.7 1.7h-7.3V20h-7.6v9.9H4.9a1.7 1.7 0 0 1-1.7-1.7V14.1Z" />
      </svg>
    );
  }

  if (name === "new") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3.2" y="3.2" width="11" height="11" rx="2.3" />
        <rect x="17.8" y="3.2" width="11" height="11" rx="2.3" />
        <rect x="3.2" y="17.8" width="11" height="11" rx="2.3" />
        <rect x="17.8" y="17.8" width="11" height="11" rx="2.3" />
      </svg>
    );
  }

  if (name === "radio") {
    return (
      <svg viewBox="0 0 36 32" aria-hidden="true" fill="none">
        <circle cx="18" cy="16" r="2.8" fill="currentColor" />
        <path d="M13.2 10.8a7.4 7.4 0 0 0 0 10.4M22.8 10.8a7.4 7.4 0 0 1 0 10.4M8.7 6.3a13.7 13.7 0 0 0 0 19.4M27.3 6.3a13.7 13.7 0 0 1 0 19.4M4.2 2.3a19.2 19.2 0 0 0 0 27.4M31.8 2.3a19.2 19.2 0 0 1 0 27.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "library") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <mask id="library-note-cutout">
            <rect width="32" height="32" fill="white" />
            <path d="M21.3 16.3v6.8a3.6 3.6 0 1 1-1.8-3.1v-5l4.2-.9v2.2l-2.4.5Z" fill="black" />
          </mask>
        </defs>
        <path d="M9.1 3h15.8v4.1H9.1zM6.6 8.6h18.3v3.3H6.6zM5.3 13.3h21.4v15.1H5.3z" mask="url(#library-note-cutout)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="none">
      <circle cx="13.8" cy="13.8" r="9.2" stroke="currentColor" strokeWidth="2.5" />
      <path d="m20.6 20.6 7.1 7.1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const items: Array<{ id: DockItem; label: string; target: string }> = [
  { id: "home", label: "Home", target: "top" },
  { id: "new", label: "New", target: "recently-played" },
  { id: "radio", label: "Radio", target: "made-for-you" },
  { id: "library", label: "Library", target: "your-library" },
];

export default function BottomDock() {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlay, nextTrack, openPlayer } = usePlayer();
  const pathname = usePathname();
  const active = pathname === "/" ? "home" : pathname.includes("genre") || pathname.includes("playlist") ? "radio" : pathname.includes("album") || pathname.includes("artist") ? "library" : "new";

  function goTo(item: (typeof items)[number]) {
    if (item.id === "home") router.push("/");
    else if (item.id === "new") router.push("/browse/songs");
    else if (item.id === "radio") router.push("/browse/genres");
    else router.push("/browse/all");
  }

  function openSearch() {
    router.push("/browse/all");
  }

  return (
    <nav className={styles.dock} aria-label="Playback and navigation">
      {/* Top Bar: Now Playing / Mini Player */}
      {currentTrack && <div className={styles.miniPlayerWrapper}>
        <GlassSurface
          width="100%"
          height="100%"
          borderRadius="999px"
          borderWidth={0.04}
          brightness={100}
          opacity={0.08}
          blur={11}
          displace={5}
          backgroundOpacity={0.08}
          saturation={1}
          distortionScale={-180}
          redOffset={0}
          greenOffset={10}
          blueOffset={20}
          xChannel="R"
          yChannel="G"
          mixBlendMode="difference"
          className={styles.miniPlayerSurface}
        >
          <div
            className={styles.miniTrackInfo}
            onClick={openPlayer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPlayer();
              }
            }}
            aria-label={`Open player: ${currentTrack.title} by ${currentTrack.artist}`}
          >
            <div className={styles.miniCover}>
              {currentTrack.coverImage && (
                <Image
                  src={currentTrack.coverImage}
                  alt={currentTrack.title}
                  fill
                  sizes="48px"
                />
              )}
            </div>
            <div className={styles.miniCopy}>
              <span className={styles.miniTitle}>{currentTrack.title}</span>
              <span className={styles.miniArtist}>{currentTrack.artist}</span>
            </div>
          </div>

          <div className={styles.miniControls}>
            <button
              className={styles.miniButton}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5v14l12-7-12-7Z" />
                </svg>
              )}
            </button>
            <button
              className={styles.miniButton}
              onClick={(e) => {
                e.stopPropagation();
                nextTrack();
              }}
              type="button"
              aria-label="Next track"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m4.5 6 7 6-7 6V6Zm8 0 7 6-7 6V6Z" />
              </svg>
            </button>
          </div>
        </GlassSurface>
      </div>}

      {/* Bottom Bar: Navigation and Search */}
      <div className={styles.navRow}>
        <GlassSurface
          width="calc(100% - clamp(48px, 15.5cqw, 58px) - 8px)"
          height="100%"
          borderRadius="999px"
          borderWidth={0.04}
          brightness={100}
          opacity={0.08}
          blur={11}
          displace={5}
          backgroundOpacity={0.08}
          saturation={1}
          distortionScale={-180}
          redOffset={0}
          greenOffset={10}
          blueOffset={20}
          xChannel="R"
          yChannel="G"
          mixBlendMode="difference"
          className={styles.pill}
        >
          {items.map((item) => (
            <button
              className={`${styles.item} ${active === item.id ? styles.active : ""}`}
              key={item.id}
              onClick={() => goTo(item)}
              type="button"
              aria-current={active === item.id ? "page" : undefined}
            >
              <span className={styles.itemIcon}><DockIcon name={item.id} /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </GlassSurface>

        <GlassSurface
          width="clamp(48px, 15.5cqw, 58px)"
          height="100%"
          borderRadius="50%"
          borderWidth={0.04}
          brightness={100}
          opacity={0.08}
          blur={11}
          displace={5}
          backgroundOpacity={0.08}
          saturation={1}
          distortionScale={-180}
          redOffset={0}
          greenOffset={10}
          blueOffset={20}
          xChannel="R"
          yChannel="G"
          mixBlendMode="difference"
          className={styles.searchSurface}
        >
          <button className={styles.search} type="button" onClick={openSearch} aria-label="Search">
            <DockIcon name="search" />
          </button>
        </GlassSurface>
      </div>
    </nav>
  );
}
