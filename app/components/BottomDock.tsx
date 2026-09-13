"use client";

import { useState } from "react";
import GlassSurface from "./GlassSurface";
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
  const [active, setActive] = useState<DockItem>("home");

  function goTo(item: (typeof items)[number]) {
    setActive(item.id);
    document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openSearch() {
    const input = document.querySelector<HTMLInputElement>(".search-field input");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input?.focus({ preventScroll: true }), 380);
  }

  return (
    <nav className={styles.dock} aria-label="Primary navigation">
      <GlassSurface
        width="84.8%"
        height="84.1%"
        borderRadius="999px"
        borderWidth={0.07}
        brightness={50}
        opacity={0.93}
        blur={11}
        displace={5}
        backgroundOpacity={0}
        saturation={0}
        distortionScale={-180}
        redOffset={0}
        greenOffset={10}
        blueOffset={20}
        xChannel="R"
        yChannel="G"
        mixBlendMode="difference"
        className={styles.pill}
      >
        <span className={styles.divider} aria-hidden="true" />
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
        width="16.1%"
        height="84.1%"
        borderRadius="50%"
        borderWidth={0.07}
        brightness={50}
        opacity={0.93}
        blur={11}
        displace={5}
        backgroundOpacity={0}
        saturation={0}
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
    </nav>
  );
}
