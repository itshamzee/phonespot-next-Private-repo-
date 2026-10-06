import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/client";

/** Gammelt prislistelink for en model: åbner samme model i Varer, Reparationer. */
export default async function PrislisteModelRedirect({ params }: { params: Promise<{ brandSlug: string; modelSlug: string }> }) {
  const { brandSlug, modelSlug } = await params;
  let target = "/admin/varer/reparationer";
  try {
    const { data } = await createServerClient()
      .from("repair_models")
      .select("id, repair_brands!inner(slug)")
      .eq("slug", modelSlug)
      .eq("repair_brands.slug", brandSlug)
      .maybeSingle();
    const id = (data as { id?: string } | null)?.id;
    if (id) target = `/admin/varer/reparationer?model=${id}`;
  } catch {
    /* faldbak: kataloget uden valgt model */
  }
  redirect(target);
}
