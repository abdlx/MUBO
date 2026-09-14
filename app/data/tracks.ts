export type Track = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  artists: string[];
  artistIds: string[];
  album: string;
  albumArtist: string;
  albumId: string;
  duration: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  year: number | null;
  genres: string[];
  art: "road" | "field" | "electric" | "ocean" | "apricot";
  coverImage: string | null;
  streamUrl: string;
};

export type LibraryResponse = {
  tracks: Track[];
  musicPathConfigured: boolean;
  error?: string;
};
