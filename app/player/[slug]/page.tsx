import PlayerClient from "./PlayerClient";

export default async function PlayerPage({ params }: PageProps<"/player/[slug]">) {
  const { slug } = await params;
  return <PlayerClient slug={slug} />;
}
