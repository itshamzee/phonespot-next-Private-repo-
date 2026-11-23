import { describe, it, expect } from "vitest";
import { buildTicketPatch } from "../patch";
import { activityText } from "../case-timeline";

describe("buildTicketPatch: kunde- og enhedsoplysninger", () => {
  it("trimmer og gemmer navn, telefon og e-mail", () => {
    const r = buildTicketPatch({ customer_name: "  Anna Hansen ", customer_phone: " +45 12 34 56 78", customer_email: "anna@example.dk " });
    expect(r.error).toBeUndefined();
    expect(r.patch).toEqual({ customer_name: "Anna Hansen", customer_phone: "+45 12 34 56 78", customer_email: "anna@example.dk" });
  });

  it("afviser tomt navn, for kort telefon og forkert e-mail", () => {
    expect(buildTicketPatch({ customer_name: "  " }).error).toMatch(/Navn/);
    expect(buildTicketPatch({ customer_phone: "1234" }).error).toMatch(/8 cifre/);
    expect(buildTicketPatch({ customer_email: "anna@" }).error).toMatch(/E-mail/);
  });

  it("tillader at fjerne e-mail og telefon", () => {
    expect(buildTicketPatch({ customer_email: "", customer_phone: "" }).patch).toEqual({ customer_email: "", customer_phone: "" });
  });

  it("holder IMEI uden for sagens felter og sender kundekort-valget med", () => {
    const r = buildTicketPatch({ serial_number: " 3567 ", update_customer: true });
    expect(r.error).toBeUndefined();
    expect(r.patch).toEqual({});
    expect(r.serialNumber).toBe("3567");
    expect(r.updateCustomer).toBe(true);
    expect(buildTicketPatch({ serial_number: "" }).serialNumber).toBeNull();
  });

  it("ignorerer felter uden for listen", () => {
    expect(buildTicketPatch({ status: "afhentet", paid: true }).error).toMatch(/Ingen gyldige felter/);
  });
});

describe("historik for rettede oplysninger", () => {
  it("viser fra og til, men ikke hele fejlbeskrivelsen", () => {
    const text = activityText({
      action: "repair_case_details_changed",
      details: {
        changes: [
          { field: "customer_phone", label: "Telefon", from: "12345678", to: "87654321" },
          { field: "issue_description", label: "Fejl", from: "gammel", to: "ny lang tekst" },
        ],
        customer_card_updated: true,
      },
    });
    expect(text).toBe("Oplysninger rettet. Telefon: 12345678 til 87654321; Fejl rettet. Kundekortet er også rettet.");
  });
});
