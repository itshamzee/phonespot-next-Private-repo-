/**
 * Server-logik for "Ny sag": opret sag, redigér linjer, annullér og træk dele.
 * Hver handling er ét Postgres-kald (repair_case_*), så sag, linjer, lagerreservation og
 * statuslog enten sker samlet eller slet ikke. Priser slås op i databasen; her tjekkes kun
 * rettigheder, butik og formen på svaret.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/client";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { storeForNewRecord, type StoreScope } from "@/lib/auth/store-scope";
import { sendSms } from "@/lib/gateway-api/client";
import { getSmsTemplate } from "@/lib/gateway-api/templates";
import { CaseError, caseRpcError } from "@/lib/repairs/case-errors";
import { assertPricesValid } from "@/lib/repairs/case-pricing";
import { canSeeCost } from "@/lib/repairs/availability";
import type { CreateCaseBody } from "@/lib/repairs/case-schemas";
import type {
  AddCaseItemResponse,
  CancelCaseResponse,
  CaseBackorder,
  CaseItemView,
  CreateRepairCaseResponse,
  NewCaseItemInput,
  RemoveCaseItemResponse,
  SwapPartResponse,
} from "@/lib/repairs/new-case-types";

type Db = SupabaseClient;

/** /admin/kasse?sag=<id> og samme med depositum-dialogen åben. */
export function kasseUrls(ticketId: string): { kasse_url: string; deposit_url: string } {
  const base = `/admin/kasse?sag=${encodeURIComponent(ticketId)}`;
  return { kasse_url: base, deposit_url: `${base}&depositum=1` };
}

/** Kostpris er kun for manager og owner. */
export function shapeLines(lines: CaseItemView[] | null | undefined, role: string | null | undefined): CaseItemView[] {
  const see = canSeeCost(role);
  return (lines ?? []).map((l) => {
    if (see) return l;
    const { cost_oere: _cost, ...rest } = l;
    void _cost;
    return rest;
  });
}

type RawCreate = Omit<CreateRepairCaseResponse, "kasse_url" | "deposit_url">;

export function shapeCreateResponse(raw: RawCreate, role: string | null | undefined): CreateRepairCaseResponse {
  return {
    ...raw,
    lines: shapeLines(raw.lines, role),
    backorders: raw.backorders ?? [],
    warnings: raw.warnings ?? [],
    needs_deposit: Boolean(raw.needs_deposit),
    replayed: Boolean(raw.replayed),
    ...kasseUrls(raw.ticket_id),
  };
}

/** Butikken sagen oprettes i: egen butik, eller ejerens valg. Ellers fejl (som ved indlevering). */
export function resolveCaseStore(
  staff: StaffIdentity,
  scope: StoreScope,
  requested: string | null | undefined,
): "vejle" | "slagelse" {
  const store = storeForNewRecord(staff, scope, requested);
  if (!store) {
    throw new CaseError(
      "store_required",
      staff.role === "owner"
        ? "Vælg hvilken butik enheden er indleveret i."
        : "Din bruger er ikke knyttet til en fysisk butik. Bed ejeren tildele dig en butik.",
      400,
    );
  }
  return store;
}

/** Payload til repair_case_create. Eksporteret så formen kan testes uden database. */
export function buildCreatePayload(
  body: CreateCaseBody,
  staff: Pick<StaffIdentity, "id" | "name">,
  store: "vejle" | "slagelse",
  idempotencyKey: string | null,
) {
  return {
    staff_id: staff.id,
    idempotency_key: idempotencyKey,
    store_id: store,
    customer: body.customer,
    device: body.device,
    items: body.items,
    details: {
      ...(body.details ?? {}),
      // Ansvarlig = indlogget medarbejder, hvis intet andet er valgt.
      assigned_to: body.details?.assigned_to ?? staff.name ?? null,
    },
  };
}

export async function createRepairCase(
  body: CreateCaseBody,
  ctx: { staff: StaffIdentity; scope: StoreScope },
  idempotencyKey: string | null,
  db: Db = createServerClient(),
): Promise<CreateRepairCaseResponse> {
  const store = resolveCaseStore(ctx.staff, ctx.scope, body.store_id);
  assertPricesValid(body.items as NewCaseItemInput[]);

  const { data, error } = await db.rpc("repair_case_create", {
    p: buildCreatePayload(body, ctx.staff, store, idempotencyKey),
  });
  if (error || !data) throw caseRpcError("Sagen kunne ikke oprettes", error ?? { message: "tomt svar" });

  const result = shapeCreateResponse(data as RawCreate, ctx.staff.role);
  if (body.notify_sms && !result.replayed) {
    const warning = await sendReceivedSms(db, result.ticket_id, body.customer.phone);
    if (warning) result.warnings = [...result.warnings, warning];
  }
  return result;
}

/** SMS "modtaget" som ved indlevering. Fejl her fortryder aldrig sagen; kun en advarsel. */
export async function sendReceivedSms(db: Db, ticketId: string, phone: string): Promise<string | null> {
  try {
    const { data: ticket } = await db
      .from("repair_tickets")
      .select("id, ticket_number, store_id, customer_id, customer_name, device_type, device_model")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticket) return null;
    const t = ticket as {
      id: string;
      ticket_number: string | null;
      store_id: string | null;
      customer_id: string | null;
      customer_name: string;
      device_type: string;
      device_model: string;
    };
    const message = getSmsTemplate("modtaget", {
      customerName: t.customer_name,
      deviceName: t.device_model,
      ticketId: t.id,
      ticketNumber: t.ticket_number,
      storeId: t.store_id,
      trackingUrl: `https://phonespot.dk/reparation/status/${t.id}`,
    });
    if (!message) return null;
    const result = await sendSms(phone, message);
    await db.from("sms_log").insert({
      ticket_id: t.id,
      customer_id: t.customer_id,
      phone,
      message,
      provider_message_id: result.messageId,
      status: result.success ? "sent" : "failed",
    });
    return result.success ? null : "Sagen er oprettet, men SMS'en til kunden kunne ikke sendes.";
  } catch (err) {
    console.error("[repairs] received SMS failed:", ticketId, err);
    return "Sagen er oprettet, men SMS'en til kunden kunne ikke sendes.";
  }
}

type LinesResult = { lines: CaseItemView[]; backorders: CaseBackorder[]; total_oere: number; warnings?: string[] };

function shapeLinesResult(raw: LinesResult, role: string | null | undefined) {
  return {
    lines: shapeLines(raw.lines, role),
    backorders: raw.backorders ?? [],
    total_oere: raw.total_oere ?? 0,
  };
}

export async function addCaseItem(
  ticketId: string,
  item: NewCaseItemInput,
  staff: StaffIdentity,
  db: Db = createServerClient(),
): Promise<AddCaseItemResponse & { warnings: string[] }> {
  assertPricesValid([item]);
  const { data, error } = await db.rpc("repair_case_add_item", {
    p: { ticket_id: ticketId, staff_id: staff.id, item },
  });
  if (error || !data) throw caseRpcError("Linjen kunne ikke tilføjes", error ?? { message: "tomt svar" });
  const raw = data as LinesResult;
  return { ...shapeLinesResult(raw, staff.role), warnings: raw.warnings ?? [] };
}

export async function removeCaseItem(
  ticketId: string,
  itemId: string,
  staff: StaffIdentity,
  db: Db = createServerClient(),
): Promise<RemoveCaseItemResponse> {
  const { data, error } = await db.rpc("repair_case_remove_item", {
    p: { ticket_id: ticketId, item_id: itemId, staff_id: staff.id },
  });
  if (error || !data) throw caseRpcError("Linjen kunne ikke fjernes", error ?? { message: "tomt svar" });
  return shapeLinesResult(data as LinesResult, staff.role);
}

export async function swapCasePart(
  ticketId: string,
  itemId: string,
  skuProductId: string,
  staff: StaffIdentity,
  db: Db = createServerClient(),
): Promise<SwapPartResponse> {
  const { data, error } = await db.rpc("repair_case_swap_part", {
    p: { ticket_id: ticketId, item_id: itemId, sku_product_id: skuProductId, staff_id: staff.id },
  });
  if (error || !data) throw caseRpcError("Delen kunne ikke skiftes", error ?? { message: "tomt svar" });
  return shapeLinesResult(data as LinesResult, staff.role);
}

export async function cancelCase(
  ticketId: string,
  reason: string,
  staff: StaffIdentity,
  db: Db = createServerClient(),
): Promise<CancelCaseResponse> {
  const { data, error } = await db.rpc("repair_case_cancel", {
    p: { ticket_id: ticketId, staff_id: staff.id, reason },
  });
  if (error || !data) throw caseRpcError("Sagen kunne ikke annulleres", error ?? { message: "tomt svar" });
  return data as CancelCaseResponse;
}

/** Ved status 'faerdig': træk delene fra lager (idempotent). Antal brugte dele, eller kaster. */
export async function consumeRepairParts(
  ticketId: string,
  staffId: string | null,
  db: Db = createServerClient(),
): Promise<{ consumed: number; shortfall: number }> {
  const { data, error } = await db.rpc("repair_consume_parts", { p_ticket_id: ticketId, p_staff_id: staffId });
  if (error) throw caseRpcError("Dele kunne ikke trækkes fra lager", error);
  const r = (data ?? {}) as { consumed?: number; shortfall?: number };
  return { consumed: r.consumed ?? 0, shortfall: r.shortfall ?? 0 };
}
