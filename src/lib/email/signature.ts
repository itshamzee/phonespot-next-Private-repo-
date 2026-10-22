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
  /** Main line shown as "Tlf." — the store's number or the company number. */
  phone: string;
  /** Personal number shown as "Mobil" when a staff member signs. */
  mobile: string | null;
  email: string;
  website: string;
  cvr: string | null;
  trustpilotUrl: string | null;
  /** Round portrait next to the details (staff_profiles.avatar_url). */
  photoUrl: string | null;
  logoUrl: string;
}

export const SIGNATURE_LOGO_URL = "https://phonespot.dk/brand/logos/phonespot-wordmark-green.png";

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
  staff: (Pick<StaffProfile, "display_name" | "title" | "phone"> & { avatar_url?: string | null }) | null;
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
    logoUrl: SIGNATURE_LOGO_URL,
  };

  if (opts.staff) {
    const phone = store?.phone || company.phone || DEFAULT_COMPANY.phone!;
    const own = opts.staff.phone?.trim() || null;
    return {
      ...base,
      name: opts.staff.display_name,
      title: opts.staff.title || null,
      phone,
      mobile: own && own.replace(/\s+/g, "") !== phone.replace(/\s+/g, "") ? own : null,
      email: mailbox ?? company.email ?? COMPANY_EMAIL,
      photoUrl: opts.staff.avatar_url || null,
    };
  }
  if (store) {
    return { ...base, name: store.name, title: null, phone: store.phone, mobile: null, email: store.email, photoUrl: null };
  }
  return {
    ...base,
    name: `${base.company} kundeservice`,
    title: null,
    phone: company.phone ?? DEFAULT_COMPANY.phone!,
    mobile: null,
    email: mailbox ?? company.email ?? COMPANY_EMAIL,
    photoUrl: null,
  };
}

/** Look up the staff profile bound to the mailbox and the company row, then build. */
export async function resolveSignature(sb: SupabaseClient, mailbox: string | null): Promise<Signature> {
  const [{ data: company }, { data: staff }] = await Promise.all([
    sb.from("company_settings").select("*").maybeSingle(),
    mailbox
      ? sb.from("staff_profiles").select("display_name, title, phone, avatar_url").eq("mailbox", mailbox.toLowerCase()).eq("is_active", true).limit(1).maybeSingle()
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
    `Tlf. ${displayPhone(sig.phone)}`,
    sig.mobile ? `Mobil ${displayPhone(sig.mobile)}` : null,
    `Mail ${sig.email}`,
    `Web ${websiteLabel(sig.website)}`,
    sig.cvr ? `CVR ${sig.cvr}` : null,
  ];
  if (sig.trustpilotUrl) lines.push("", "Bedøm os på Trustpilot", `Skriv en anmeldelse: ${sig.trustpilotUrl}`);
  return lines.filter((l): l is string => l !== null && l !== undefined).join("\n");
}
