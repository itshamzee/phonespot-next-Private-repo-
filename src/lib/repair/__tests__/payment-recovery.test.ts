import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PAY_IN_STORE_LOG_NOTE,
  convertToPayInStore,
  hashRecoveryToken,
  lookupRecoverableTickets,
  newRecoveryToken,
  onlinePaymentFields,
  tokenMatches,
  type RecoveryTicket,
} from "../payment-recovery";
import { makeRecoverySupabase, type Row } from "./recovery-supabase";

const ID1 = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
const GROUP = "33333333-3333-4333-8333-333333333333";

function ticket(id: string, hash: string, extra: Row = {}, details: Row = {}): Row {
  return {
    id,
    ticket_number: null,
    customer_name: "Test",
    customer_email: "t@example.com",
    customer_phone: "12345678",
    device_type: "Apple",
    device_model: "iPhone 15",
    issue_description: "x",
    store_id: "vejle",
    status: "modtaget",
    paid: false,
    booking_details: { ...onlinePaymentFields(hash), selected_services: [], ...details },
    ...extra,
  };
}

const db = (s: ReturnType<typeof makeRecoverySupabase>) => s.client as unknown as SupabaseClient;

describe("recovery token", () => {
  it("matches only the right token and rejects malformed hashes", () => {
    const { token, hash } = newRecoveryToken();
    expect(hash).toBe(hashRecoveryToken(token));
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(token + "x", hash)).toBe(false);
    expect(tokenMatches("kort", hash)).toBe(false);
    expect(tokenMatches(token, undefined)).toBe(false);
    expect(tokenMatches(token, "ikke-hex")).toBe(false);
  });
});

describe("lookupRecoverableTickets", () => {
  it("accepts an unpaid web booking with the right token", async () => {
    const { token, hash } = newRecoveryToken();
    const s = makeRecoverySupabase([ticket(ID1, hash, {}, { checkout_session_id: "cs_test_1" })]);
    const res = await lookupRecoverableTickets(db(s), ID1, token);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.tickets).toHaveLength(1);
      expect(res.alreadyInStore).toBe(false);
      expect(res.sessionId).toBe("cs_test_1");
    }
  });

  it("gives the same answer for a wrong token, a missing token and an unknown id", async () => {
    const { hash } = newRecoveryToken();
    const s = makeRecoverySupabase([ticket(ID1, hash)]);
    expect(await lookupRecoverableTickets(db(s), ID1, "forkert-token-forkert-token")).toEqual({ ok: false, reason: "invalid" });
    expect(await lookupRecoverableTickets(db(s), ID1, undefined)).toEqual({ ok: false, reason: "invalid" });
    expect(await lookupRecoverableTickets(db(s), ID2, "forkert-token-forkert-token")).toEqual({ ok: false, reason: "invalid" });
    expect(await lookupRecoverableTickets(db(s), "ikke-et-uuid", "x")).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses tickets without a stored hash (in-store, staff-created or old online tickets)", async () => {
    const { token } = newRecoveryToken();
    const t = ticket(ID1, "x");
    t.booking_details = { selected_services: [] };
    const s = makeRecoverySupabase([t]);
    expect(await lookupRecoverableTickets(db(s), ID1, token)).toEqual({ ok: false, reason: "invalid" });
  });

  it("reports paid and closed (archived or received) tickets", async () => {
    const { token, hash } = newRecoveryToken();
    const paid = makeRecoverySupabase([ticket(ID1, hash, { paid: true })]);
    expect(await lookupRecoverableTickets(db(paid), ID1, token)).toEqual({ ok: false, reason: "paid" });
    const archived = makeRecoverySupabase([ticket(ID1, hash, { status: "annulleret" })]);
    expect(await lookupRecoverableTickets(db(archived), ID1, token)).toEqual({ ok: false, reason: "closed" });
  });

  it("loads every device of a multi-device booking", async () => {
    const { token, hash } = newRecoveryToken();
    const s = makeRecoverySupabase([
      ticket(ID1, hash, {}, { booking_group_id: GROUP, booking_device_index: 1 }),
      ticket(ID2, hash, {}, { booking_group_id: GROUP, booking_device_index: 2 }),
    ]);
    const res = await lookupRecoverableTickets(db(s), ID1, token);
    expect(res.ok && res.tickets.map((t) => t.id).sort()).toEqual([ID1, ID2]);
  });

  it("flags tickets already converted to pay-in-store", async () => {
    const { token, hash } = newRecoveryToken();
    const s = makeRecoverySupabase([ticket(ID1, hash, {}, { payment_flow: "butik" })]);
    const res = await lookupRecoverableTickets(db(s), ID1, token);
    expect(res.ok && res.alreadyInStore).toBe(true);
  });
});

describe("convertToPayInStore", () => {
  it("stamps booking_details, keeps status modtaget and writes a status log line per ticket", async () => {
    const { hash } = newRecoveryToken();
    const s = makeRecoverySupabase([
      ticket(ID1, hash, {}, { booking_group_id: GROUP }),
      ticket(ID2, hash, {}, { booking_group_id: GROUP }),
    ]);
    const tickets = s.state.tickets.map((t) => ({ ...t })) as unknown as RecoveryTicket[];
    expect(await convertToPayInStore(db(s), tickets)).toBe(true);
    for (const t of s.state.tickets) {
      const d = t.booking_details as Row;
      expect(d.payment_flow).toBe("butik");
      expect(typeof d.converted_from_online_at).toBe("string");
      expect(d.recovery_token_hash).toBe(hash);
      expect(t.status).toBe("modtaget");
      expect(t.paid).toBe(false);
    }
    expect(s.state.logs).toHaveLength(2);
    expect(s.state.logs[0]).toMatchObject({ old_status: "modtaget", new_status: "modtaget", note: PAY_IN_STORE_LOG_NOTE });
  });

  it("does nothing when the ticket was paid or archived in the meantime", async () => {
    const { hash } = newRecoveryToken();
    const s = makeRecoverySupabase([ticket(ID1, hash, { paid: true })]);
    const tickets = s.state.tickets.map((t) => ({ ...t })) as unknown as RecoveryTicket[];
    expect(await convertToPayInStore(db(s), tickets)).toBe(false);
    expect((s.state.tickets[0].booking_details as Row).payment_flow).toBe("online");
    expect(s.state.logs).toHaveLength(0);
  });
});
