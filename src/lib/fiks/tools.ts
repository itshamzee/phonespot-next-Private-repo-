import type { SupabaseClient } from "@supabase/supabase-js";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { z } from "zod";
import { buildPublicDataTools, type ToolContext } from "@/lib/mail-agent/tools";
import { FIKS_CHANNEL, FIKS_STAFF_NAME } from "./config";

export interface HandoffInput {
  name: string;
  email?: string;
  phone?: string;
  summary: string;
}

/** The chat session the handoff writes to. */
export interface HandoffTarget {
  supabase: SupabaseClient;
  inquiryId: string;
  metadata: Record<string, unknown>;
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

export function normalizeHandoff(
  input: HandoffInput,
): { ok: true; name: string; email: string | null; phone: string | null; summary: string } | { ok: false; reason: string } {
  const name = (input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const summary = (input.summary ?? "").trim().slice(0, 1000);
  const rawEmail = (input.email ?? "").trim().toLowerCase();
  const rawPhone = (input.phone ?? "").trim();
  const email = rawEmail && EMAIL_RE.test(rawEmail) && rawEmail.length <= 200 ? rawEmail : null;
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const phone =
    rawPhone && /^\+?[\d\s()-]+$/.test(rawPhone) && phoneDigits.length >= 8 && phoneDigits.length <= 15
      ? rawPhone.replace(/\s+/g, " ")
      : null;

  if (!name) return { ok: false, reason: "Mangler navn. Spørg den besøgende om navnet, før du kalder handoff igen." };
  if (!email && !phone) {
    const hint = rawEmail || rawPhone ? "Mailadressen eller telefonnummeret ser forkert ud. " : "";
    return {
      ok: false,
      reason: `${hint}Mangler mail eller telefonnummer. Spørg den besøgende om mindst et af dem, før du kalder handoff igen.`,
    };
  }
  if (!summary) return { ok: false, reason: "Mangler opsummering. Kald handoff igen med en kort opsummering af sagen." };
  return { ok: true, name, email, phone, summary };
}

/**
 * Hands the chat to staff: contact details on the inquiry, status 'ny' so it
 * lands in the to-do, and an internal note with the summary. Returns the text
 * the model sees; `done` is true only when both writes succeeded.
 */
export async function handoffImpl(target: HandoffTarget, input: HandoffInput): Promise<{ text: string; done: boolean }> {
  const checked = normalizeHandoff(input);
  if (!checked.ok) return { text: checked.reason, done: false };

  const metadata = { ...target.metadata, fiks_handoff_at: new Date().toISOString() };
  const { error: updateError } = await target.supabase
    .from("contact_inquiries")
    .update({
      name: checked.name,
      email: checked.email,
      phone: checked.phone,
      status: "ny",
      metadata,
    })
    .eq("id", target.inquiryId);
  if (updateError) {
    console.error("[fiks] handoff update failed", { code: updateError.code, message: updateError.message });
    return {
      text: "Overdragelsen fejlede teknisk. Bed den besøgende skrive til info@phonespot.dk eller ringe til butikken.",
      done: false,
    };
  }
  target.metadata = metadata;

  const { error: noteError } = await target.supabase.from("inquiry_messages").insert({
    inquiry_id: target.inquiryId,
    sender: "staff",
    channel: FIKS_CHANNEL,
    staff_name: FIKS_STAFF_NAME,
    is_internal: true,
    body: `Overdraget fra Fiks: ${checked.summary}`,
  });
  if (noteError) {
    // The inquiry is already 'ny' with contact details, so staff will see it; only the note is missing.
    console.error("[fiks] handoff note failed", { code: noteError.code, message: noteError.message });
  }
  return {
    text: "Overdraget. Fortæl den besøgende, at en kollega vender tilbage på mail eller telefon inden for åbningstiden. Lov ikke et bestemt tidspunkt.",
    done: true,
  };
}

/**
 * Tools for an anonymous chat visitor: public price data, the fact base and
 * handoff. No order, repair, buyback or customer lookups: the visitor is not
 * verified and must never be shown anyone's personal data.
 */
export function buildPublicTools(
  ctx: ToolContext,
  onHandoff: (input: HandoffInput) => Promise<{ text: string; done: boolean }>,
): BetaRunnableTool[] {
  return [
    ...buildPublicDataTools(ctx),
    betaZodTool({
      name: "handoff",
      description:
        "Overdrag samtalen til en kollega, som vender tilbage på mail eller telefon. Kræver navn og mindst én af mail eller telefon, som den besøgende selv har skrevet i chatten. Kald kun når den besøgende har sagt ja til at blive kontaktet.",
      inputSchema: z.object({
        name: z.string().describe("Den besøgendes navn"),
        email: z.string().optional().describe("Mailadresse, hvis den besøgende har givet den"),
        phone: z.string().optional().describe("Telefonnummer, hvis den besøgende har givet det"),
        summary: z.string().describe("Kort dansk opsummering af sagen til kollegaen"),
      }),
      run: async (input: HandoffInput) => {
        const result = await onHandoff(input);
        ctx.log.push({
          tool: "handoff",
          input: { has_email: Boolean(input.email), has_phone: Boolean(input.phone) },
          hits: result.done ? 1 : 0,
        });
        return result.text;
      },
    }),
  ] as BetaRunnableTool[];
}
