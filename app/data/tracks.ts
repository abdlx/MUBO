export type Track = {
  slug: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  art: "road" | "field" | "electric" | "ocean" | "apricot";
  coverImage: string;
};

export const tracks: Track[] = [
  { slug: "midnight-drive", title: "Midnight Drive", artist: "Alex Warren", album: "Night Drives", duration: 173, art: "road", coverImage: "/afterglow-cover.png" },
  { slug: "stick-season", title: "Stick Season", artist: "Noah Kahan", album: "Stick Season", duration: 182, art: "field", coverImage: "/stick-season.jpg" },
  { slug: "after-hours", title: "After Hours", artist: "The Weeknd", album: "After Hours", duration: 361, art: "electric", coverImage: "/after-hours.jpg" },
  { slug: "sos", title: "SOS", artist: "SZA", album: "SOS", duration: 237, art: "ocean", coverImage: "/sos.jpg" },
  { slug: "apricot-skies", title: "Apricot Skies", artist: "Renee Vale", album: "Apricot Skies", duration: 214, art: "apricot", coverImage: "/apricot-skies.jpg" },
];

export function getTrack(slug: string) {
  return tracks.find((track) => track.slug === slug);
}
