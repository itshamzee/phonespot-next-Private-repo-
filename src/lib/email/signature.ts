import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanySettings, StaffProfile } from "@/lib/supabase/email-types";
import { STORES, COMPANY_EMAIL } from "@/lib/store-config";

/**
 * Everything a mail signature shows. Resolved per mailbox: a staff profile
 * bound to the mailbox (staff_profiles.mailbox) signs personally; a store
 * mailbox signs as the store; anything else signs as PhoneSpot kundeservice.
 */
export interface Signature {
  name: string;
  title: string | null;
  company: string;
  phone: string;
  email: string;
  website: string;
  cvr: string | null;
  trustpilotUrl: string | null;
}

const DEFAULT_COMPANY: Pick<CompanySettings, "company_name" | "phone" | "email" | "website" | "cvr" | "trustpilot_url"> = {
  company_name: "PhoneSpot",
  phone: "+45 61 10 00 48",
  email: COMPANY_EMAIL,
  website: "https://phonespot.dk",
  cvr: "38688766",
  trustpilot_url: "https://dk.trustpilot.com/evaluate/phonespot.dk",
};

/** "+45 50 45 33 71" → "50 45 33 71" for display; the tel: link keeps the prefix. */
export function displayPhone(phone: string): string {
  return phone.replace(/^\+45\s*/, "").trim();
}

export function websiteLabel(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function buildSignature(opts: {
  mailbox: string | null;
  staff: Pick<StaffProfile, "display_name" | "title" | "phone"> | null;
  company: Partial<CompanySettings> | null;
}): Signature {
  const company = { ...DEFAULT_COMPANY, ...(opts.company ?? {}) };
  const mailbox = opts.mailbox?.toLowerCase() ?? null;
  const store = mailbox ? Object.values(STORES).find((s) => s.email.toLowerCase() === mailbox) : undefined;

  const base = {
    company: company.company_name ?? "PhoneSpot",
    website: company.website ?? DEFAULT_COMPANY.website!,
    cvr: company.cvr ?? null,
    trustpilotUrl: company.trustpilot_url ?? null,
  };

  if (opts.staff) {
    return {
      ...base,
      name: opts.staff.display_name,
      title: opts.staff.title || null,
      phone: opts.staff.phone || store?.phone || company.phone || DEFAULT_COMPANY.phone!,
      email: mailbox ?? company.email ?? COMPANY_EMAIL,
    };
  }
  if (store) {
    return { ...base, name: store.name, title: null, phone: store.phone, email: store.email };
  }
  return {
    ...base,
    name: `${base.company} kundeservice`,
    title: null,
    phone: company.phone ?? DEFAULT_COMPANY.phone!,
    email: mailbox ?? company.email ?? COMPANY_EMAIL,
  };
}

/** Look up the staff profile bound to the mailbox and the company row, then build. */
export async function resolveSignature(sb: SupabaseClient, mailbox: string | null): Promise<Signature> {
  const [{ data: company }, { data: staff }] = await Promise.all([
    sb.from("company_settings").select("*").maybeSingle(),
    mailbox
      ? sb.from("staff_profiles").select("display_name, title, phone").eq("mailbox", mailbox.toLowerCase()).eq("is_active", true).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return buildSignature({ mailbox, staff: (staff as StaffProfile | null) ?? null, company: (company as CompanySettings | null) ?? null });
}

/** Plain-text twin of the HTML signature, for the text/plain part. */
export function signatureText(sig: Signature): string {
  const lines = [
    sig.name,
    sig.title,
    sig.company.toUpperCase(),
    "",
    `Telefon ${displayPhone(sig.phone)}`,
    `Mail ${sig.email}`,
    `Web ${websiteLabel(sig.website)}`,
    sig.cvr ? `CVR ${sig.cvr}` : null,
  ];
  if (sig.trustpilotUrl) lines.push("", "Bedøm os på Trustpilot", `Skriv en anmeldelse: ${sig.trustpilotUrl}`);
  return lines.filter((l): l is string => l !== null && l !== undefined).join("\n");
}
