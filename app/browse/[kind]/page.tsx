import BrowseClient from "../../components/BrowseClient";

export default async function BrowsePage({ params, searchParams }: PageProps<"/browse/[kind]">) {
  const { kind } = await params;
  const { q } = await searchParams;
  return <BrowseClient kind={kind} initialQuery={typeof q === "string" ? q : ""} />;
}
