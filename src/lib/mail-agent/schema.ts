import { z } from "zod";
import { MAIL_CATEGORIES, type Assessment, type MailCategory } from "./types";

/** Shape of the submit_assessment tool input. Also the zod validation for the stored result. */
export const assessmentSchema = z.object({
  category: z.enum(MAIL_CATEGORIES).describe("Kategori for mailen"),
  needs_human: z.boolean().describe("true når en medarbejder skal se mailen før der svares"),
  reason: z.string().min(1).max(400).describe("Én dansk sætning til medarbejderen om hvorfor"),
  summary: z.string().min(1).max(200).describe("Én kort dansk linje der beskriver hvad kunden vil"),
  confidence: z.number().min(0).max(1).describe("0–1, samlet sikkerhed på kategori og udkast"),
  draft: z
    .object({
      subject: z.string().min(1).max(200),
      body: z.string().min(1).max(6000),
    })
    .nullable()
    .describe("Udkast til svar, eller null hvis kategorien ikke skal besvares"),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;

interface Handling {
  createInquiry: boolean;
  draft: boolean;
  forceHuman: boolean;
}

const HANDLING: Record<MailCategory, Handling> = {
  ordre: { createInquiry: true, draft: true, forceHuman: false },
  reparation: { createInquiry: true, draft: true, forceHuman: false },
  opkoeb: { createInquiry: true, draft: true, forceHuman: false },
  produkt: { createInquiry: true, draft: true, forceHuman: false },
  butik_aabningstider: { createInquiry: true, draft: true, forceHuman: false },
  andet: { createInquiry: true, draft: true, forceHuman: false },
  retur_reklamation: { createInquiry: true, draft: true, forceHuman: true },
  leverandoer_b2b: { createInquiry: true, draft: false, forceHuman: true },
  nyhedsbrev_spam: { createInquiry: false, draft: false, forceHuman: false },
  system_notifikation: { createInquiry: false, draft: false, forceHuman: false },
};

export function handlingFor(category: MailCategory): Handling {
  return HANDLING[category];
}

/**
 * Applies the rules the model must not be able to override: forced-human
 * categories, lookup scope mismatches, and no drafts for categories that never
 * get an answer.
 */
export function finalizeAssessment(a: Assessment, opts: { scopeMismatch: boolean }): Assessment {
  const h = handlingFor(a.category);
  let needs_human = a.needs_human || h.forceHuman;
  let reason = a.reason;
  if (opts.scopeMismatch) {
    needs_human = true;
    reason = `Opslag matchede en anden adresse end afsenderens. ${a.reason}`.trim();
  }
  return { ...a, needs_human, reason, draft: h.draft ? a.draft : null };
}
