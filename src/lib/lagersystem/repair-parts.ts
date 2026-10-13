import { actorLabel, locationForStore } from "./locations";
import type { RepairPartRow, RepairPartsRepo } from "./types";

export type StaffRef = { id: string; name: string | null; email: string | null };
export type ServiceResult<T> = { ok: true; value: T } | { ok: false; status: 400 | 404 | 409; message: string };

export const takeKey = (ticketId: string, rowId: string) => `repair:${ticketId}:take:${rowId}`;
export const returnKey = (ticketId: string, takeId: string) => `repair:${ticketId}:return:${takeId}`;

const uuid = () => crypto.randomUUID();

export async function addPart(
  repo: RepairPartsRepo,
  input: { ticketId: string; sharedSku: string; partName: string; qty: number; costPriceOre: number | null; staff: StaffRef; newId?: () => string; now?: Date },
): Promise<ServiceResult<RepairPartRow>> {
  if (!Number.isInteger(input.qty) || input.qty < 1 || input.qty > 100) {
    return { ok: false, status: 400, message: "Antal skal være et helt tal mellem 1 og 100" };
  }
  if (!input.sharedSku?.trim() || !input.partName?.trim()) {
    return { ok: false, status: 400, message: "Del og navn skal udfyldes" };
  }
  if (input.costPriceOre !== null && (!Number.isInteger(input.costPriceOre) || input.costPriceOre < 0)) {
    return { ok: false, status: 400, message: "Kostpris skal være et helt beløb i øre på 0 eller mere" };
  }
  const ticket = await repo.getTicket(input.ticketId);
  if (!ticket) return { ok: false, status: 404, message: "Sagen findes ikke" };
  const location = locationForStore(ticket.store_id);
  if (!location) return { ok: false, status: 409, message: "Vælg butik på sagen, før du registrerer dele" };

  const id = (input.newId ?? uuid)();
  const row = await repo.insert(
    {
      id,
      ticket_id: ticket.id,
      movement_type: "TAKE",
      reverses_id: null,
      shared_sku: input.sharedSku,
      part_name: input.partName,
      qty: input.qty,
      location_code: location,
      cost_at_time_ore: input.costPriceOre,
      idempotency_key: takeKey(ticket.id, id),
      actor_label: actorLabel(input.staff),
      reference: ticket.ticket_number ?? ticket.id,
      created_by: input.staff.id,
    },
    input.now ?? new Date(),
  );
  if (row === "duplicate") return { ok: false, status: 409, message: "Delen er allerede registreret" };
  return { ok: true, value: row };
}

export async function removePart(
  repo: RepairPartsRepo,
  input: { ticketId: string; partId: string; staff: StaffRef; newId?: () => string; now?: Date },
): Promise<ServiceResult<RepairPartRow>> {
  let take = await repo.getPart(input.partId);
  if (!take || take.ticket_id !== input.ticketId || take.movement_type !== "TAKE") {
    return { ok: false, status: 404, message: "Delen findes ikke på sagen" };
  }
  const now = input.now ?? new Date();

  // Blev udtaget aldrig bogført, er der intet at returnere — skjul det bare.
  if (take.status === "failed") {
    if (await repo.voidFailedPart(take.id, now)) {
      return { ok: true, value: { ...take, voided_at: now.toISOString() } };
    }
    // Rækken er ændret undervejs (genforsøgt eller allerede fjernet): vurder igen.
    const fresh = await repo.getPart(take.id);
    if (!fresh) return { ok: false, status: 404, message: "Delen findes ikke på sagen" };
    take = fresh;
    if (take.status === "failed") return { ok: true, value: take };
  }

  // RETURN først (unik pr. TAKE), så en fejl før void kan gentages uden dobbelt retur.
  let ret = await repo.findReturnFor(take.id);
  if (!ret) {
    const inserted = await repo.insert(
      {
        id: (input.newId ?? uuid)(),
        ticket_id: take.ticket_id,
        movement_type: "RETURN",
        reverses_id: take.id,
        shared_sku: take.shared_sku,
        part_name: take.part_name,
        qty: take.qty,
        location_code: take.location_code,
        cost_at_time_ore: take.cost_at_time_ore,
        idempotency_key: returnKey(take.ticket_id, take.id),
        actor_label: actorLabel(input.staff),
        reference: take.reference,
        created_by: input.staff.id,
      },
      now,
    );
    ret = inserted === "duplicate" ? await repo.findReturnFor(take.id) : inserted;
  }
  if (!ret) return { ok: false, status: 409, message: "Delen kunne ikke fjernes. Prøv igen" };
  await repo.voidPart(take.id, now);
  return { ok: true, value: ret };
}

export async function retryPart(
  repo: RepairPartsRepo,
  input: { ticketId: string; partId: string; now?: Date },
): Promise<ServiceResult<RepairPartRow>> {
  const row = await repo.getPart(input.partId);
  if (!row || row.ticket_id !== input.ticketId) return { ok: false, status: 404, message: "Delen findes ikke på sagen" };
  if (row.voided_at) return { ok: false, status: 409, message: "Delen er fjernet fra sagen" };
  if (row.status !== "failed") return { ok: false, status: 409, message: "Kun dele, der ikke blev bogført, kan sendes igen" };
  const reset = await repo.resetForRetry(row.id, input.now ?? new Date());
  if (!reset) return { ok: false, status: 409, message: "Delen er allerede sendt igen" };
  return { ok: true, value: reset };
}
