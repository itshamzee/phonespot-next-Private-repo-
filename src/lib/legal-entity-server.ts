import { createServerClient } from "@/lib/supabase/client";
import { DEFAULT_LEGAL_ENTITY, type LegalEntityInfo } from "@/lib/legal-entity";

export type { LegalEntityInfo };
export { receiptLegalLine } from "@/lib/legal-entity";

type Row = { legal_entities: LegalEntityInfo | LegalEntityInfo[] | null } | null;

async function lookup(column: "id" | "slug", value: string | null): Promise<LegalEntityInfo> {
  if (!value) return DEFAULT_LEGAL_ENTITY;
  try {
    const { data, error } = await createServerClient()
      .from("locations")
      .select("legal_entities(name, cvr)")
      .eq(column, value)
      .maybeSingle();
    if (error) return DEFAULT_LEGAL_ENTITY;
    const rel = (data as Row)?.legal_entities;
    const entity = Array.isArray(rel) ? rel[0] : rel;
    if (entity?.name && entity.cvr) return { name: entity.name, cvr: entity.cvr };
  } catch {
    /* fall through to default */
  }
  return DEFAULT_LEGAL_ENTITY;
}

/** The legal entity behind a location; Fixon when unknown or on lookup failure. Never throws. */
export function legalEntityForLocation(locationId: string | null): Promise<LegalEntityInfo> {
  return lookup("id", locationId);
}

/** Same, for repair tickets where store_id is a text slug ('vejle' | 'slagelse' | null). */
export function legalEntityForStoreSlug(slug: string | null): Promise<LegalEntityInfo> {
  return lookup("slug", slug);
}
