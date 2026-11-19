import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { NextResponse, after as runAfter } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendReply, finalizeReply, ReplyError } from "@/lib/inquiries/reply";
import { staffDisplayName } from "@/lib/inquiries/inbox";

const STATUS_BY_CODE = {
  not_found: 404,
  no_email: 400,
  no_phone: 400,
  send_failed: 502,
  saved_failed: 500,
} as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireInquiryAccess(req, id);
  if (!access.ok) return access.response;
  const supabase = createServerClient();
  let payload: { body?: unknown; channel?: unknown; after?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  // staff_name i body ignoreres bevidst: afsenderen er altid den loggede medarbejder.
  const { body, channel, after } = payload ?? {};

  if (typeof body !== "string" || !body.trim() || (channel !== "email" && channel !== "sms")) {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  if (after !== undefined && after !== "done" && after !== "waiting") {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  const staffName = staffDisplayName(access.staff);

  try {
    const result = await sendReply(supabase, {
      inquiryId: id,
      body,
      staffName,
      channel,
    });
    // Efter afsendelsen må intet gøre svaret til en fejl, der inviterer til gensendelse.
    let bookkept = false;
    try {
      bookkept = await finalizeReply(supabase, id, after ?? "waiting", { id: access.staff.id, name: staffName });
      // Svaret er sendt: ventende Fiks-udkast på tråden er nu overflødige. Lukningen og mail-flytningen
      // (IMAP) sker efter svaret, så en langsom postserver aldrig kan time ud et allerede sendt svar.
      runAfter(async () => {
        try {
          const { discardPendingDrafts } = await import("@/lib/mail-agent/draft-handling");
          await discardPendingDrafts(supabase, id, staffName);
        } catch {
          console.error(`[reply route] closing drafts failed for inquiry ${id}`);
        }
      });
    } catch {
      bookkept = false;
      console.error(`[reply route] bookkeeping threw for inquiry ${id}`);
    }
    return NextResponse.json(
      bookkept
        ? { id: result.messageRowId }
        : { id: result.messageRowId, warning: "Svaret er sendt, men sagen kunne ikke opdateres. Opdater siden." },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ReplyError) {
      return NextResponse.json({ error: err.message }, { status: STATUS_BY_CODE[err.code] });
    }
    console.error(`[reply route] unexpected error for inquiry ${id}:`, err);
    return NextResponse.json({ error: "Der opstod en fejl. Prøv igen." }, { status: 500 });
  }
}
