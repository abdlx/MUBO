"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayer } from "../context/PlayerContext";
import styles from "./DesktopSidebar.module.css";

const mainLinks = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/browse/all", label: "Search", icon: "⌕" },
  { href: "/browse/songs", label: "Songs", icon: "♫" },
];
const libraryLinks = [
  { href: "/browse/albums", label: "Albums" },
  { href: "/browse/artists", label: "Artists" },
  { href: "/browse/genres", label: "Genres" },
  { href: "/browse/playlists", label: "Playlists" },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { tracks } = usePlayer();
  return <aside className={styles.sidebar} aria-label="Desktop navigation">
    <Link href="/" className={styles.brand}><span className={styles.brandMark}>m</span><strong>Mubo</strong></Link>
    <nav className={styles.mainNav} aria-label="Main navigation">{mainLinks.map(link => <Link key={link.href} href={link.href} className={pathname === link.href ? styles.active : ""} aria-current={pathname === link.href ? "page" : undefined}><span className={styles.icon} aria-hidden="true">{link.icon}</span>{link.label}</Link>)}</nav>
    <div className={styles.divider} />
    <p className={styles.caption}>YOUR LIBRARY</p>
    <nav className={styles.libraryNav} aria-label="Library navigation">{libraryLinks.map(link => <Link key={link.href} href={link.href} className={pathname === link.href || (link.href === "/browse/albums" && pathname.startsWith("/album/")) || (link.href === "/browse/artists" && pathname.startsWith("/artist/")) ? styles.active : ""}>{link.label}</Link>)}</nav>
    <div className={styles.footer}><span>{tracks.length} songs in your library</span><small>Your music, your way</small></div>
  </aside>;
}
