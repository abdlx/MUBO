import type { Track } from "./tracks";

export type AlbumSummary = {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  coverImage: string | null;
  art: Track["art"];
  trackCount: number;
};

export type ArtistSummary = {
  id: string;
  name: string;
  coverImage: string | null;
  art: Track["art"];
  trackCount: number;
};

export function getAlbums(tracks: Track[]) {
  const albums = new Map<string, AlbumSummary>();
  for (const track of tracks) {
    const existing = albums.get(track.albumId);
    if (existing) {
      existing.trackCount += 1;
      existing.coverImage ??= track.coverImage;
      existing.year ??= track.year;
    } else {
      albums.set(track.albumId, {
        id: track.albumId,
        title: track.album,
        artist: track.albumArtist,
        year: track.year,
        coverImage: track.coverImage,
        art: track.art,
        trackCount: 1,
      });
    }
  }
  return Array.from(albums.values()).sort((a, b) =>
    a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" }) ||
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}

export function getArtists(tracks: Track[]) {
  const artists = new Map<string, ArtistSummary>();
  for (const track of tracks) {
    track.artists.forEach((name, index) => {
      const id = track.artistIds[index];
      const existing = artists.get(id);
      if (existing) {
        existing.trackCount += 1;
        existing.coverImage ??= track.coverImage;
      } else {
        artists.set(id, { id, name, coverImage: track.coverImage, art: track.art, trackCount: 1 });
      }
    });
  }
  return Array.from(artists.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
