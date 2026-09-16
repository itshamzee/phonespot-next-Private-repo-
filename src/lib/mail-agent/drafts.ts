import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiDraftRow } from "./types";

export type NewDraft = Omit<
  AiDraftRow,
  "id" | "created_at" | "status" | "final_body" | "reviewed_by" | "reviewed_at" | "sent_at"
>;

export async function insertDraft(sb: SupabaseClient, row: NewDraft): Promise<AiDraftRow> {
  const { data, error } = await sb
    .from("ai_drafts")
    .insert({ ...row, status: "pending" })
    .select()
    .single();
  if (error || !data) throw new Error(`Kunne ikke gemme forslag: ${error?.message ?? "ukendt fejl"}`);
  return data as AiDraftRow;
}

export async function markDraft(
  sb: SupabaseClient,
  id: string,
  patch: Partial<Pick<AiDraftRow, "status" | "final_body" | "reviewed_by" | "reviewed_at" | "sent_at">>,
): Promise<void> {
  const { error } = await sb.from("ai_drafts").update(patch).eq("id", id);
  if (error) throw new Error(`Kunne ikke opdatere forslag: ${error.message}`);
}
