import { describe, it, expect } from "vitest";
import { getSmsTemplate } from "../templates";
import { STORES } from "@/lib/store-config";

const base = { customerName: "Mette", deviceName: "iPhone 13", ticketId: "abcdef12-0000" };

describe("repair SMS templates", () => {
  it("uses the ticket number and the ticket's own store", () => {
    const sms = getSmsTemplate("modtaget", { ...base, ticketNumber: "PS-2026-0007", storeId: "vejle" })!;
    expect(sms).toContain("PS-2026-0007");
    expect(sms).toContain(STORES.vejle.name);
    expect(sms).not.toContain(STORES.slagelse.name);
  });

  it("uses the Vejle phone number in the quote text", () => {
    const sms = getSmsTemplate("tilbud_sendt", { ...base, storeId: "vejle", price: 899 })!;
    expect(sms).toContain(STORES.vejle.phone);
  });

  it("does not send a quote text without a price", () => {
    expect(getSmsTemplate("tilbud_sendt", base)).toBeNull();
  });

  it("writes proper Danish letters", () => {
    const sms = getSmsTemplate("faerdig", { ...base, storeId: "slagelse" })!;
    expect(sms).toMatch(/Åbent/);
    expect(sms).toMatch(/Lørdag/);
    expect(sms).not.toMatch(/Aabent|Loerdag/);
  });
});
