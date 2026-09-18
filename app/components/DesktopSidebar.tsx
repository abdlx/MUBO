"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePlayer } from "../context/PlayerContext";
import styles from "./DesktopSidebar.module.css";

const mainLinks = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/browse/all", label: "Search", icon: "search" },
  { href: "/browse/songs", label: "Songs", icon: "music" },
];
function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H3V10Z" /><path d="M9 20v-7h6v7" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
    music: <><path d="M10 17V5l10-2v12" /><circle cx="6.5" cy="17.5" r="3.5" /><circle cx="16.5" cy="15.5" r="3.5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
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
    <Link href="/" className={styles.brand}><Image src="/mubo-mark.svg" width={34} height={34} alt="" /><strong>Mubo</strong></Link>
    <nav className={styles.mainNav} aria-label="Main navigation">{mainLinks.map(link => <Link key={link.href} href={link.href} className={pathname === link.href ? styles.active : ""} aria-current={pathname === link.href ? "page" : undefined}><span className={styles.icon}><NavIcon name={link.icon} /></span>{link.label}</Link>)}</nav>
    <div className={styles.divider} />
    <p className={styles.caption}>YOUR LIBRARY</p>
    <nav className={styles.libraryNav} aria-label="Library navigation">{libraryLinks.map(link => <Link key={link.href} href={link.href} className={pathname === link.href || (link.href === "/browse/albums" && pathname.startsWith("/album/")) || (link.href === "/browse/artists" && pathname.startsWith("/artist/")) ? styles.active : ""}>{link.label}</Link>)}</nav>
    <div className={styles.footer}><span>{tracks.length} songs in your library</span><small>Your music, your way</small></div>
  </aside>;
}
