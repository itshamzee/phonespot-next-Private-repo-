import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildInboxRows,
  type InboxDraftInput,
  type InboxInquiryInput,
  type InboxMessageInput,
  type InboxRow,
} from "@/lib/inquiries/inbox";

/** Højst så mange id'er pr. `in(...)`-forespørgsel, så URL'erne holdes korte. */
export const ID_CHUNK = 100;

export function chunk<T>(items: T[], size = ID_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Henter beskeder og udkast for præcis de givne henvendelser (kun deres id'er, i
 * grupper af højst 100) og sætter rækkerne sammen. Aldrig en global "de nyeste N":
 * en snakkesalig tråd kan ikke skubbe en anden tråds rækker ud. Inden for en gruppe
 * sorteres nyeste først, og buildInboxRows bruger første række pr. tråd.
 */
export async function loadInboxRows(
  sb: SupabaseClient,
  inquiries: InboxInquiryInput[],
  opts: { withBody: boolean } = { withBody: true },
): Promise<InboxRow[]> {
  // Tællere behøver ikke tekst: uden body (og uden udkasttekst) bliver forespørgslerne små.
  const msgColumns = opts.withBody ? "inquiry_id, sender, body, is_internal, created_at" : "inquiry_id, sender, is_internal, created_at";
  const draftColumns = opts.withBody
    ? "inquiry_id, status, needs_human, reason, draft_body, review_verdict, created_at"
    : "inquiry_id, status, needs_human, reason, review_verdict, created_at";
  const ids = inquiries.map((i) => i.id);
  const groups = chunk(ids);

  const results = await Promise.all(
    groups.map(async (group) => {
      const [msgRes, draftRes] = await Promise.all([
        sb
          .from("inquiry_messages")
          .select(msgColumns)
          .in("inquiry_id", group)
          .eq("is_internal", false)
          .order("created_at", { ascending: false }),
        sb
          .from("ai_drafts")
          .select(draftColumns)
          .in("inquiry_id", group)
          .in("status", ["pending", "auto_sent"])
          .order("created_at", { ascending: false }),
      ]);
      if (msgRes.error) throw msgRes.error;
      if (draftRes.error) throw draftRes.error;
      return {
        messages: (msgRes.data ?? []) as unknown as InboxMessageInput[],
        drafts: (draftRes.data ?? []) as unknown as InboxDraftInput[],
      };
    }),
  );

  return buildInboxRows(
    inquiries,
    results.flatMap((r) => r.messages),
    results.flatMap((r) => r.drafts),
  );
}
