import CollectionClient from "../../components/CollectionClient";

export default async function AlbumPage({ params }: PageProps<"/album/[id]">) {
  return <CollectionClient kind="album" id={(await params).id} />;
}
