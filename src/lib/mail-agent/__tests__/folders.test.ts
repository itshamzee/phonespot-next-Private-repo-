import { describe, it, expect } from "vitest";
import { folderByRules, folderForCategory, FOLDERS } from "@/lib/mail-agent/folders";

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

describe("folderForCategory", () => {
  it("maps every category to an existing folder", () => {
    for (const c of ["ordre", "reparation", "opkoeb", "retur_reklamation", "produkt", "butik_aabningstider", "leverandoer_b2b", "nyhedsbrev_spam", "system_notifikation", "andet"] as const) {
      expect(FOLDERS[folderForCategory(c)]).toBeDefined();
    }
    expect(folderForCategory("ordre")).toBe("kunder_ordrer");
    expect(folderForCategory("produkt")).toBe("kunder_andet");
  });
});
