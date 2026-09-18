import BrowseClient from "../../components/BrowseClient";

export default async function BrowsePage({ params }: PageProps<"/browse/[kind]">) {
  const { kind } = await params;
  return <BrowseClient key={kind} kind={kind} />;
}
