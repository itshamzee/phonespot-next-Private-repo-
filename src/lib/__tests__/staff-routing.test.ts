import { describe, it, expect } from "vitest";
import { getStaffRecipients, CENTRAL_INBOX } from "@/lib/email/staff-routing";
import { STORES, STORE, COMPANY_EMAIL, storeForId } from "@/lib/store-config";

describe("getStaffRecipients", () => {
  it("sends a Slagelse enquiry to the Slagelse mailbox with info in bcc", () => {
    expect(getStaffRecipients("slagelse")).toEqual({
      to: "slagelse@phonespot.dk",
      bcc: [CENTRAL_INBOX],
    });
  });

  it("sends a Vejle enquiry to the Vejle mailbox with info in bcc", () => {
    expect(getStaffRecipients("vejle")).toEqual({
      to: "vejle@phonespot.dk",
      bcc: [CENTRAL_INBOX],
    });
  });

  it("sends an enquiry with no store to the central inbox alone", () => {
    // No bcc — copying the central inbox to itself would duplicate the mail.
    expect(getStaffRecipients(null)).toEqual({ to: CENTRAL_INBOX });
    expect(getStaffRecipients(undefined)).toEqual({ to: CENTRAL_INBOX });
    expect(getStaffRecipients("")).toEqual({ to: CENTRAL_INBOX });
  });

  it("falls back to the central inbox for a store slug we do not know", () => {
    expect(getStaffRecipients("aarhus")).toEqual({ to: CENTRAL_INBOX });
  });

  it("accepts the casing and padding a form field can produce", () => {
    expect(getStaffRecipients(" Slagelse ").to).toBe("slagelse@phonespot.dk");
  });

  it("keeps every store on its own mailbox", () => {
    // The whole point of the routing: a store that still points at info@ would
    // silently send its enquiries to the shared inbox.
    for (const store of Object.values(STORES)) {
      expect(store.email).not.toBe(CENTRAL_INBOX);
      expect(getStaffRecipients(store.slug).to).toBe(store.email);
    }
  });
});

describe("storeForId", () => {
  it("resolves a slug to its own store", () => {
    expect(storeForId("vejle").city).toBe("Vejle");
    expect(storeForId("slagelse").city).toBe("Slagelse");
  });

  it("falls back to Slagelse for a record with no store", () => {
    // Customer mail has to name some address; this is what it always used.
    expect(storeForId(null)).toBe(STORE);
    expect(storeForId("ukendt")).toBe(STORE);
  });
});

describe("company vs store addresses", () => {
  it("keeps the company inbox separate from any single store's", () => {
    // The footer and other company-wide surfaces use COMPANY_EMAIL. If it ever
    // becomes a store mailbox, every page starts advertising one store's inbox.
    expect(COMPANY_EMAIL).toBe("info@phonespot.dk");
    expect(COMPANY_EMAIL).not.toBe(STORE.email);
  });
});
