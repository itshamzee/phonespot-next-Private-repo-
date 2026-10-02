import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/resend", () => ({ resend: { emails: { send: vi.fn() } } }));

import {
  buildRepairConfirmationHtml,
  buildRepairConfirmationSubject,
  type RepairConfirmationParams,
} from "../repair-confirmation";

const base: RepairConfirmationParams = {
  ticketId: "abcdef12-2222-3333-4444-555555555555",
  customerName: "Mette <script>",
  customerEmail: "mette@example.com",
  deviceLabel: "iPhone 15",
  services: [{ name: "Skærmskift (Budget)", price_dkk: 1599 }],
  totalDkk: 1599,
  paid: false,
  deliveryMethod: "Aflever i Vejle",
  storeId: "vejle",
  preferredDate: "2026-10-05",
  preferredTime: "12:00-14:00",
};

describe("repair confirmation email", () => {
  it("tells the customer where and when, and that payment happens in store", () => {
    const html = buildRepairConfirmationHtml(base);
    expect(html).toContain("Din reparation er booket");
    expect(html).toContain("Løversysselvej 3B");
    expect(html).toContain("Betales i butikken");
    expect(html).toContain("/reparation/status/abcdef12-2222-3333-4444-555555555555");
    expect(html).not.toContain("<script>");
    expect(buildRepairConfirmationSubject(base)).toBe("Booking bekræftet: din reparation (abcdef12)");
  });

  it("marks prepaid repairs as paid", () => {
    const html = buildRepairConfirmationHtml({ ...base, paid: true });
    expect(html).toContain("betalt og booket");
    expect(html).toContain("Betalt online");
  });

  it("gives mail-in customers shipping instructions instead of a store visit", () => {
    const html = buildRepairConfirmationHtml({ ...base, deliveryMethod: "Send ind" });
    expect(html).toContain("gratis forsendelse");
    expect(html).not.toContain("Find vej");
  });
});
