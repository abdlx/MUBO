import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrack, tracks } from "../../data/tracks";
import PlayerClient from "./PlayerClient";

export function generateStaticParams() {
  return tracks.map((track) => ({ slug: track.slug }));
}

export async function generateMetadata({ params }: PageProps<"/player/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const track = getTrack(slug);
  return track
    ? { title: `${track.title} — ${track.artist} | Mubo` }
    : { title: "Track not found | Mubo" };
}

export default async function PlayerPage({ params }: PageProps<"/player/[slug]">) {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();

  return <PlayerClient key={track.slug} track={track} />;
}
