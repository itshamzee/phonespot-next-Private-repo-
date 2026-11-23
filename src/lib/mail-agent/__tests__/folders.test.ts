import { describe, it, expect } from "vitest";
import { folderByRules, folderForAnswered, folderForCategory, FOLDERS, isContactNotice, isReadOnFiling, pickAnswered, type InboxEntry } from "@/lib/mail-agent/folders";

describe("folderByRules", () => {
  it("files our own system notifications by subject", () => {
    expect(folderByRules({ fromEmail: "noreply@phonespot.dk", subject: "Kontakt (Slagelse): Sælg enhed" })).toBe("notifikationer_kontakt");
    expect(folderByRules({ fromEmail: "noreply@phonespot.dk", subject: "Ny ordre #S-1286 — Joakim" })).toBe("notifikationer_ordrer");
    expect(folderByRules({ fromEmail: "noreply@phonespot.dk", subject: "Tilbud accepteret: Daniel — iPhone 11" })).toBe("notifikationer_opkoeb");
    expect(folderByRules({ fromEmail: "noreply@phonespot.dk", subject: "Ny reparationssag (Vejle): iPhone 13" })).toBe("notifikationer_reparation");
  });

  it("files shipping, suppliers, platforms and invoices by domain and subject", () => {
    expect(folderByRules({ fromEmail: "no-reply@dao.as", subject: "Nu kan du hente din pakke" })).toBe("fragt");
    expect(folderByRules({ fromEmail: "info@capida.dk", subject: "Din Capida bestilling er afsendt" })).toBe("leverandoerer");
    expect(folderByRules({ fromEmail: "info@capida.dk", subject: "Fakturaen for din Capida ordre" })).toBe("oekonomi");
    expect(folderByRules({ fromEmail: "billing@shopify.com", subject: "A bill payment failed" })).toBe("oekonomi");
    expect(folderByRules({ fromEmail: "carla@pricerunner.com", subject: "Ekstra eksponering" })).toBe("platforme");
    expect(folderByRules({ fromEmail: "news@x.dk", subject: "Ugens tilbud", listUnsubscribe: true })).toBe("nyhedsbreve");
    expect(folderByRules({ fromEmail: "a@gmail.com", subject: "Uopfordret ansøgning til deltidsjob" })).toBe("ansoegninger");
  });

  it("leaves customer mail to the agent", () => {
    expect(folderByRules({ fromEmail: "kunde@gmail.com", subject: "Motorola g 56" })).toBeNull();
  });
});

describe("contact notices", () => {
  it("keeps contact-form questions out of the rule folders, but not sell requests", () => {
    const support = { fromEmail: "noreply@phonespot.dk", subject: "Kontakt (Slagelse): Support" };
    expect(isContactNotice(support)).toBe(true);
    expect(folderByRules(support)).toBeNull();
    expect(isContactNotice({ fromEmail: "noreply@phonespot.dk", subject: "Kontakt (Slagelse): Sælg enheder (4)" })).toBe(false);
    expect(isContactNotice({ fromEmail: "kunde@gmail.com", subject: "Kontakt (Slagelse): Support" })).toBe(false);
    expect(isContactNotice({ fromEmail: "noreply@phonespot.dk", subject: "Ny ordre #S-1" })).toBe(false);
  });
});

describe("contact notices across mailboxes", () => {
  const polled = ["info@phonespot.dk", "slagelse@phonespot.dk", "ha@phonespot.dk"];
  const slagelse = { fromEmail: "noreply@phonespot.dk", subject: "Kontakt (Slagelse): Support" };
  const vejle = { fromEmail: "noreply@phonespot.dk", subject: "Kontakt (Vejle): Support" };
  const generic = { fromEmail: "noreply@phonespot.dk", subject: "Kontakt: Andet" };

  it("keeps a store's question in the store mailbox and files the info@ copy", () => {
    expect(isContactNotice(slagelse, { mailbox: "slagelse@phonespot.dk", polled })).toBe(true);
    expect(isContactNotice(slagelse, { mailbox: "info@phonespot.dk", polled })).toBe(false);
    expect(folderByRules(slagelse, { mailbox: "info@phonespot.dk", polled })).toBe("notifikationer_kontakt");
  });

  it("keeps questions for a store without a polled mailbox, and generic ones, in info@", () => {
    expect(isContactNotice(vejle, { mailbox: "info@phonespot.dk", polled })).toBe(true);
    expect(isContactNotice(generic, { mailbox: "info@phonespot.dk", polled })).toBe(true);
    expect(isContactNotice(generic, { mailbox: "ha@phonespot.dk", polled })).toBe(false);
  });
});

describe("isReadOnFiling", () => {
  it("marks only newsletters and our own notifications read", () => {
    expect(isReadOnFiling("nyhedsbreve")).toBe(true);
    expect(isReadOnFiling("notifikationer_ordrer")).toBe(true);
    expect(isReadOnFiling("fragt")).toBe(false);
    expect(isReadOnFiling("oekonomi")).toBe(false);
    expect(isReadOnFiling("leverandoerer")).toBe(false);
  });
});

describe("pickAnswered", () => {
  const now = new Date("2026-11-13T12:00:00Z").getTime();
  const e = (uid: number, counterpart: string, day: string, answered: boolean): InboxEntry => ({
    uid, messageId: `<${uid}@x>`, counterpart, fromEmail: counterpart, subject: "s", date: new Date(`2026-11-${day}T10:00:00Z`), answered, seen: true,
  });

  it("files a whole conversation once its newest mail is answered and a day old", () => {
    const picked = pickAnswered([e(1, "a@x.dk", "09", false), e(2, "a@x.dk", "10", true)], now);
    expect(picked.map((p) => p.uid)).toEqual([1, 2]);
  });

  it("keeps the conversation when the customer wrote again after our reply", () => {
    expect(pickAnswered([e(1, "a@x.dk", "09", true), e(2, "a@x.dk", "11", false)], now)).toEqual([]);
  });

  it("waits a day after the reply and never files unanswered mail", () => {
    expect(pickAnswered([e(1, "a@x.dk", "13", true)], now)).toEqual([]);
    expect(pickAnswered([e(2, "b@x.dk", "01", false)], now)).toEqual([]);
  });
});

describe("folderForAnswered", () => {
  it("uses the contact folder for form notices and the category otherwise", () => {
    expect(folderForAnswered({ fromEmail: "noreply@phonespot.dk", subject: "Kontakt (Vejle): Support" }, null)).toBe("notifikationer_kontakt");
    expect(folderForAnswered({ fromEmail: "k@gmail.com", subject: "Hej" }, "reparation")).toBe("kunder_reparation");
    expect(folderForAnswered({ fromEmail: "k@gmail.com", subject: "Hej" }, "leverandoer_b2b")).toBe("leverandoerer");
    expect(folderForAnswered({ fromEmail: "k@gmail.com", subject: "Hej" }, null)).toBe("kunder_andet");
  });
});

describe("folderForCategory", () => {
  it("maps every category to an existing folder", () => {
    for (const c of ["ordre", "reparation", "opkoeb", "retur_reklamation", "produkt", "butik_aabningstider", "leverandoer_b2b", "nyhedsbrev_spam", "system_notifikation", "andet"] as const) {
      expect(FOLDERS[folderForCategory(c)]).toBeDefined();
    }
    expect(folderForCategory("ordre")).toBe("kunder_ordrer");
    expect(folderForCategory("produkt")).toBe("kunder_andet");
  });
});
