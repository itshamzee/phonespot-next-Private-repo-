import { redirect } from "next/navigation";

// Legacy brand hub — we now have a single /beskyttelsesglas page with an inline
// model picker, so any old brand-specific URL just redirects back to the hub.
export default async function LegacyBrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  await params;
  redirect("/beskyttelsesglas");
}
