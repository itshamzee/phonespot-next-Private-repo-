import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";
const bodySchema = z.object({ email: z.string().trim().toLowerCase().email() });

// Best-effort throttle pr. instans: højst ét link pr. e-mail pr. 2 minutter.
const lastSent = new Map<string, number>();
const THROTTLE_MS = 2 * 60 * 1000;

/** Escaper %, _ og \ så ilike matcher bogstaveligt. */
function likeExact(value: string) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * POST /api/konto/login-link  { email }
 * "Glemt adgangskode": sender et login-link til en kunde, der findes i customers.
 * De fleste kunder er oprettet i kassen uden login, så auth-brugeren oprettes her
 * og kobles til kunden. Svaret er altid det samme, så man ikke kan teste hvilke
 * e-mails der er kunder. Personale-konti får aldrig et link herfra.
 */
export async function POST(request: NextRequest) {
  const ok = NextResponse.json({ sent: true });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldig e-mailadresse" }, { status: 400 });
  const email = parsed.data.email;

  const now = Date.now();
  if (now - (lastSent.get(email) ?? 0) < THROTTLE_MS) return ok;
  lastSent.set(email, now);

  try {
    const supabase = createServerClient();
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, email, auth_id")
      .ilike("email", likeExact(email))
      .order("created_at", { ascending: true })
      .limit(5);
    // Eksakt match: ilike bruges kun for store/små bogstaver, aldrig som mønster.
    const exact = (customers ?? []).filter((c) => c.email?.trim().toLowerCase() === email);
    const customer = exact.find((c) => c.auth_id) ?? exact[0];
    if (!customer) return ok;

    const { data: staff } = await supabase.from("staff").select("email").ilike("email", likeExact(email)).limit(5);
    if ((staff ?? []).some((s) => s.email?.trim().toLowerCase() === email)) return ok;

    // Opret auth-brugeren hvis den mangler (fejler stille, hvis den findes).
    await supabase.auth.admin.createUser({ email, email_confirm: true });
    const { data: link, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.user || !link.properties?.hashed_token) {
      console.error("[konto] login-link generateLink failed:", error);
      return ok;
    }

    const { data: staffByAuth } = await supabase.from("staff").select("id").eq("auth_id", link.user.id).maybeSingle();
    if (staffByAuth) return ok;

    if (!customer.auth_id) {
      await supabase.from("customers").update({ auth_id: link.user.id }).eq("id", customer.id).is("auth_id", null);
    } else if (customer.auth_id !== link.user.id) {
      console.error("[konto] login-link: customer auth_id mismatch", customer.id);
      return ok;
    }

    const url = `${SITE_URL}/glemt-adgangskode?token_hash=${encodeURIComponent(link.properties.hashed_token)}`;
    const firstName = (customer.name ?? "").split(" ")[0];
    const { resend, EMAIL_FROM } = await import("@/lib/email/resend");
    const { error: mailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Dit login-link til PhoneSpot",
      text: `Hej${firstName ? ` ${firstName}` : ""}

Klik på linket for at logge ind på din PhoneSpot-konto. Linket virker i 1 time og kan kun bruges én gang.

${url}

Har du ikke bedt om linket, kan du se bort fra denne mail.

PhoneSpot · phonespot.dk`,
    });
    if (mailError) console.error("[konto] login-link mail failed:", mailError);
  } catch (err) {
    console.error("[konto] login-link failed:", err);
  }
  return ok;
}
