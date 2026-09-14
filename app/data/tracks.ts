export type Track = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  album: string;
  duration: number | null;
  art: "road" | "field" | "electric" | "ocean" | "apricot";
  coverImage: string | null;
  streamUrl: string;
};

export type LibraryResponse = {
  tracks: Track[];
  musicPathConfigured: boolean;
  error?: string;
};
