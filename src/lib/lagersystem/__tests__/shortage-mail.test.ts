// @vitest-environment node
import { expect, it } from "vitest";
import { buildShortageMail } from "../shortage-mail";

const ticket = { id: "0f0f0f0f-aaaa-4bbb-8ccc-123456789abc", ticket_number: "PS-2026-0042", device_model: "iPhone 13", customer_name: "Jens Hansen", store_id: "slagelse" };
const lines = [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }];

it("goes to the store's mailbox with the ticket, the missing parts and a link", () => {
  const m = buildShortageMail(ticket, lines);
  expect(m.to).toBe("slagelse@phonespot.dk");
  expect(m.subject).toBe("Del skal bestilles: iPhone 13 (PS-2026-0042)");
  expect(m.text).toContain("Skærm iPhone 13 (SCR-IP13): skal bruge 1, ledigt 0");
  expect(m.text).toContain("https://phonespot.dk/admin/reparationer/0f0f0f0f-aaaa-4bbb-8ccc-123456789abc");
  expect(m.text).toContain("Kunden har ikke fået besked");
});

it("uses the central inbox and a short id for a ticket without store or number", () => {
  const m = buildShortageMail({ ...ticket, store_id: null, ticket_number: null }, lines);
  expect(m.to).toBe("info@phonespot.dk");
  expect(m.subject).toBe("Del skal bestilles: iPhone 13 (0f0f0f0f)");
});

it("never shows negative availability to staff as a confusing number", () => {
  expect(buildShortageMail(ticket, [{ ...lines[0], available: -3 }]).text).toContain("ledigt 0 (saldo i minus)");
});

it("names the Vejle stock location in plain Danish", () => {
  expect(buildShortageMail({ ...ticket, store_id: "vejle" }, lines).text).toContain("Lager: Hovedlager Vejle");
});
