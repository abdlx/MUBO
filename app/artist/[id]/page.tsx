import CollectionClient from "../../components/CollectionClient";

export default async function ArtistPage({ params }: PageProps<"/artist/[id]">) {
  return <CollectionClient kind="artist" id={(await params).id} />;
}
