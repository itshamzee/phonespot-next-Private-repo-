// @vitest-environment node
import { expect, it, vi } from "vitest";

const sendStaffMail = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/email/onecom-staff-mail", () => ({ sendStaffMail }));

import { buildTransferRequestMail, sendTransferRequestMail } from "../transfer-mail";

const base = {
  id: "tr1", from: "vejle-hub", to: "phonespot-slagelse", requested_by_company: "phonespot", status: "REQUESTED" as const,
  reference: "PS-2026-0042", note: "Kunden kommer torsdag", reject_reason: null, requested_by_label: "PhoneSpot-admin: Maria",
  sent_by_label: null, received_by_label: null, created_at: "", sent_at: null, received_at: null,
  lines: [{ shared_sku: "SCR-IP13", part_name: "Skærm iPhone 13", qty_requested: 2, qty_sent: null, qty_received: 0, qty_written_off: 0, write_off_reason: null, unit_cost_ore: null }],
};

it("goes to the sender's staff and names Hovedlager Vejle, never the code", () => {
  const m = buildTransferRequestMail(base);
  expect(m.to).toBe("vejle@phonespot.dk");
  expect(m.subject).toBe("Anmodning om dele til Slagelse (PS-2026-0042)");
  expect(m.text).toContain("Slagelse beder Hovedlager Vejle om at sende:");
  expect(m.text).toContain("- 2 × Skærm iPhone 13 (SCR-IP13)");
  expect(m.text).toContain("Note: Kunden kommer torsdag");
  expect(m.text).toContain("https://phonespot.dk/admin/lager/reservedele?fane=flytninger");
  expect(m.text).not.toContain("vejle-hub");
});

it("Slagelse requests go to slagelse@, Esbjerg (no mailbox yet) to the central inbox", () => {
  expect(buildTransferRequestMail({ ...base, from: "phonespot-slagelse", to: "vejle-hub" }).to).toBe("slagelse@phonespot.dk");
  expect(buildTransferRequestMail({ ...base, from: "phonespot-esbjerg", to: "vejle-hub" }).to).toBe("info@phonespot.dk");
});

it("sends through the one.com staff mail helper", async () => {
  const mail = buildTransferRequestMail(base);
  await sendTransferRequestMail(mail);
  expect(sendStaffMail).toHaveBeenCalledWith(mail);
});
