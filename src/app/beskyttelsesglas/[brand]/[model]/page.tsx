import { redirect } from "next/navigation";

// Legacy model detail page — the new single-page picker at /beskyttelsesglas
// takes a ?model= query param. Redirect there preserving the model slug so
// any old links / Google results still land on the right configured state.
export default async function LegacyModelPage({
  params,
}: {
  params: Promise<{ brand: string; model: string }>;
}) {
  const { model } = await params;
  redirect(`/beskyttelsesglas?model=${encodeURIComponent(model)}`);
}
