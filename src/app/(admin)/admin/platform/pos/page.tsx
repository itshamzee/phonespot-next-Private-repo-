import { redirect } from "next/navigation";

/**
 * Kassen bor nu på /admin/kasse. Gamle links og bogmærker (også med ?sag=…)
 * sendes videre med deres parametre.
 */
export default async function PosRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(suffix ? `/admin/kasse?${suffix}` : "/admin/kasse");
}
