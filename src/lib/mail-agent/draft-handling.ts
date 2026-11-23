import type { SupabaseClient } from "@supabase/supabase-js";
import { markDraft } from "./drafts";
import { fileInquiryMail } from "./run";

/**
 * Kasserer ét udkast og lægger den tilhørende mail i sin mappe. Fælles kodevej for
 * discard-ruten og for svar-ruten, der selv lukker ventende udkast efter et sendt svar.
 */
export async function discardDraftRow(sb: SupabaseClient, draftId: string, staffName: string): Promise<number> {
  await markDraft(sb, draftId, { status: "discarded", reviewed_by: staffName, reviewed_at: new Date().toISOString() });
  const { data: draft } = await sb.from("ai_drafts").select("inquiry_id, category").eq("id", draftId).maybeSingle();
  let filed = 0;
  if (draft) {
    try {
      filed = await fileInquiryMail(sb, draft.inquiry_id as string, draft.category as string);
    } catch (err) {
      console.warn("[mail-agent] kunne ikke flytte mailen til mappe:", (err as Error).message);
    }
  }
  return filed;
}

/** Kasserer alle ventende udkast på en henvendelse. Kaster ved første databasefejl. */
export async function discardPendingDrafts(sb: SupabaseClient, inquiryId: string, staffName: string): Promise<void> {
  const { data, error } = await sb.from("ai_drafts").select("id").eq("inquiry_id", inquiryId).eq("status", "pending");
  if (error) throw new Error("kunne ikke hente ventende udkast");
  for (const d of (data ?? []) as { id: string }[]) await discardDraftRow(sb, d.id, staffName);
}
