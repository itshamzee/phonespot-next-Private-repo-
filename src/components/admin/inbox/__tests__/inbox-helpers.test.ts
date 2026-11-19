import { describe, expect, it } from "vitest";
import type { InboxRow } from "@/lib/inquiries/inbox";
import {
  addReadId,
  availableChannels,
  basedOnLine,
  buildThreadItems,
  formatKr,
  isUnread,
  lookupLabels,
  matchedByLabel,
  nextAfter,
  parseReadIds,
  reviewLink,
  smsInfo,
  snoozePresets,
  type ThreadDraft,
  type ThreadMessage,
} from "../inbox-helpers";

const row = (over: Partial<InboxRow> = {}): InboxRow => ({
  id: "a",
  name: "Camilla Holm",
  subject: "Skærm",
  preview: "Hej",
  channel: "email",
  mailbox: "info@phonespot.dk",
  store: "vejle",
  status: "ny",
  assignedTo: null,
  assignedName: null,
  snoozedUntil: null,
  lastInboundAt: "2026-11-19T08:00:00Z",
  needsHuman: false,
  needsHumanReason: null,
  hasDraft: false,
  fiksAnswered: false,
  isPublic: false,
  source: "mail",
  ...over,
});

describe("lookupLabels", () => {
  it("oversætter værktøjsnavne til danske etiketter i rækkefølge uden dubletter", () => {
    expect(
      lookupLabels([
        { tool: "diagnose", input: {}, hits: 1 },
        { tool: "quote_repair", input: {}, hits: 1 },
        { tool: "quote_repair", input: {}, hits: 2 },
        { tool: "lookup_orders", input: {}, hits: 0 },
      ]),
    ).toEqual(["symptomtabel", "prisopslag reparation", "ordreopslag"]);
  });

  it("kender alle otte værktøjer", () => {
    const tools = ["quote_repair", "diagnose", "quote_buyback", "lookup_orders", "lookup_repairs", "lookup_buyback", "lookup_customer", "get_knowledge"];
    expect(lookupLabels(tools.map((tool) => ({ tool })))).toEqual([
      "prisopslag reparation",
      "symptomtabel",
      "vejledende opkøbspris",
      "ordreopslag",
      "sagsopslag",
      "opkøbsopslag",
      "kundeopslag",
      "faktabasen",
    ]);
  });

  it("springer ukendte værktøjer og skrald over", () => {
    expect(lookupLabels([{ tool: "submit_assessment" }, null, "x", { tool: 3 }])).toEqual([]);
    expect(lookupLabels(null)).toEqual([]);
    expect(lookupLabels("diagnose")).toEqual([]);
  });

  it("basedOnLine samler etiketterne til én dansk sætning", () => {
    expect(basedOnLine([{ tool: "diagnose" }])).toBe("Bygger på: symptomtabel");
    expect(basedOnLine([{ tool: "diagnose" }, { tool: "quote_repair" }])).toBe("Bygger på: symptomtabel og prisopslag reparation");
    expect(basedOnLine([{ tool: "diagnose" }, { tool: "quote_repair" }, { tool: "get_knowledge" }])).toBe(
      "Bygger på: symptomtabel, prisopslag reparation og faktabasen",
    );
    expect(basedOnLine([])).toBeNull();
  });
});

describe("nextAfter", () => {
  const rows = [row({ id: "a" }), row({ id: "b" }), row({ id: "c" })];
  it("giver sagen efter den aktuelle", () => {
    expect(nextAfter(rows, "a")).toBe("b");
    expect(nextAfter(rows, "b")).toBe("c");
  });
  it("giver den forrige, når den aktuelle er den sidste", () => {
    expect(nextAfter(rows, "c")).toBe("b");
  });
  it("giver den første, når den aktuelle ikke er i listen", () => {
    expect(nextAfter(rows, "zz")).toBe("a");
    expect(nextAfter(rows, null)).toBe("a");
  });
  it("giver null, når der ikke er andre sager", () => {
    expect(nextAfter([row({ id: "a" })], "a")).toBeNull();
    expect(nextAfter([], "a")).toBeNull();
  });
});

describe("availableChannels", () => {
  it("mail kræver en brugbar mail, SMS kræver et telefonnummer", () => {
    expect(availableChannels({ channel: "email", email: "a@b.dk", phone: null })).toEqual(["email"]);
    expect(availableChannels({ channel: "email", email: "a@b.dk", phone: "+45 20 12 34 56" })).toEqual(["email", "sms"]);
    expect(availableChannels({ channel: "form", email: null, phone: "20123456" })).toEqual(["sms"]);
    expect(availableChannels({ channel: "email", email: "ikke-en-mail", phone: "1234" })).toEqual([]);
    expect(availableChannels({ channel: "email", email: "*@b.dk", phone: null })).toEqual([]);
  });
  it("SMS-sager foreslår SMS først", () => {
    expect(availableChannels({ channel: "sms", email: "a@b.dk", phone: "20123456" })).toEqual(["sms", "email"]);
  });
  it("anmeldelser har ingen kanal", () => {
    expect(availableChannels({ channel: "google_review", email: "a@b.dk", phone: "20123456" })).toEqual([]);
    expect(availableChannels({ channel: "trustpilot_review", email: null, phone: null })).toEqual([]);
  });
});

describe("reviewLink", () => {
  const msg = (body: string, over: Partial<ThreadMessage> = {}): ThreadMessage => ({
    id: Math.random().toString(),
    sender: "customer",
    channel: "google_review",
    body,
    staff_name: null,
    is_internal: false,
    created_at: "2026-11-19T08:00:00Z",
    ...over,
  });
  it("finder første https-link til Google eller Trustpilot i første besked", () => {
    expect(reviewLink([msg("Se https://www.google.com/maps/reviews/abc.")])).toBe("https://www.google.com/maps/reviews/abc");
    expect(reviewLink([msg("https://g.page/r/xyz")])).toBe("https://g.page/r/xyz");
    expect(reviewLink([msg("Link: https://dk.trustpilot.com/reviews/123, tak")])).toBe("https://dk.trustpilot.com/reviews/123");
    expect(reviewLink([msg("https://trustpilot.com/r/1")])).toBe("https://trustpilot.com/r/1");
  });
  it("springer fremmede domæner og http over", () => {
    expect(reviewLink([msg("https://evil.com/google.com https://google.com.evil.io/x http://g.page/a")])).toBeNull();
    expect(reviewLink([msg("https://example.com/a https://g.page/ok")])).toBe("https://g.page/ok");
  });
  it("kigger kun i den første besked", () => {
    expect(reviewLink([msg("ingen link"), msg("https://g.page/senere")])).toBeNull();
    expect(reviewLink([])).toBeNull();
  });
});

describe("ulæst", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  it("en åben sag, der ikke er min og ikke er åbnet her, er ulæst", () => {
    expect(isUnread(row(), "me", new Set(), now)).toBe(true);
    expect(isUnread(row(), "me", new Set(["a"]), now)).toBe(false);
    expect(isUnread(row({ assignedTo: "me" }), "me", new Set(), now)).toBe(false);
    expect(isUnread(row({ status: "lukket" }), "me", new Set(), now)).toBe(false);
    expect(isUnread(row({ status: "besvaret" }), "me", new Set(), now)).toBe(false);
  });
  it("parseReadIds tåler skrald", () => {
    expect(parseReadIds(null)).toEqual([]);
    expect(parseReadIds("ikke json")).toEqual([]);
    expect(parseReadIds('{"a":1}')).toEqual([]);
    expect(parseReadIds('["a", 2, "b"]')).toEqual(["a", "b"]);
  });
  it("addReadId lægger nyeste sidst og holder listen kort", () => {
    expect(addReadId(["a", "b"], "a")).toEqual(["b", "a"]);
    expect(addReadId(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]);
  });
});

describe("snoozePresets", () => {
  it("i morgen, om 3 dage og næste mandag, alle kl. 9 dansk tid", () => {
    // Torsdag 19. nov. 2026 kl. 13 dansk tid (vintertid, UTC+1).
    const p = snoozePresets(new Date("2026-11-19T12:00:00Z"));
    expect(p.map((x) => x.label)).toEqual(["I morgen kl. 9", "Om 3 dage", "Næste mandag"]);
    expect(p[0].until).toBe("2026-11-20T08:00:00.000Z");
    expect(p[1].until).toBe("2026-11-22T08:00:00.000Z");
    expect(p[2].until).toBe("2026-11-23T08:00:00.000Z");
  });
  it("næste mandag fra en mandag er om en uge, og sommertid giver UTC+2", () => {
    const p = snoozePresets(new Date("2026-06-01T10:00:00Z")); // mandag
    expect(p[0].until).toBe("2026-06-02T07:00:00.000Z");
    expect(p[2].until).toBe("2026-06-08T07:00:00.000Z");
  });
});

describe("små formateringer", () => {
  it("matchedByLabel", () => {
    expect(matchedByLabel("email")).toBe("Fundet på mail");
    expect(matchedByLabel("phone")).toBe("Fundet på telefonnummer");
    expect(matchedByLabel("both")).toBe("Fundet på mail og telefon");
    expect(matchedByLabel(null)).toBeNull();
    expect(matchedByLabel(undefined)).toBeNull();
  });
  it("formatKr tager øre", () => {
    expect(formatKr(116900)).toBe("1.169 kr.");
    expect(formatKr(null)).toBeNull();
  });
  it("smsInfo tæller tegn og beskeder", () => {
    expect(smsInfo("hej")).toEqual({ chars: 3, parts: 1 });
    expect(smsInfo("a".repeat(161))).toEqual({ chars: 161, parts: 2 });
    expect(smsInfo("Æble og ø".repeat(1))).toEqual({ chars: 9, parts: 1 });
    expect(smsInfo("“citat”" + "a".repeat(70))).toEqual({ chars: 77, parts: 2 });
    expect(smsInfo("")).toEqual({ chars: 0, parts: 0 });
  });
});

describe("buildThreadItems", () => {
  const base = { inquiry_id: "a", channel: "email", is_internal: false, staff_name: null };
  const m = (over: Partial<ThreadMessage>): ThreadMessage =>
    ({ ...base, id: "m", sender: "customer", body: "x", created_at: "2026-11-19T08:00:00Z", ...over }) as ThreadMessage;
  const draft = (over: Partial<ThreadDraft>): ThreadDraft => ({
    id: "d",
    status: "pending",
    needs_human: false,
    reason: null,
    draft_body: null,
    lookups: [],
    created_at: "2026-11-19T08:01:00Z",
    ...over,
  });

  it("deler beskeder op i kunde, personale, Fiks og noter", () => {
    const items = buildThreadItems(
      [
        m({ id: "1", sender: "customer", body: "Hej" }),
        m({ id: "2", sender: "staff", staff_name: "PhoneSpot assistent", body: "Svar fra Fiks", created_at: "2026-11-19T08:02:00Z" }),
        m({ id: "3", sender: "staff", staff_name: "Sara", channel: "system", is_internal: true, body: "Note", created_at: "2026-11-19T08:03:00Z" }),
        m({ id: "4", sender: "staff", staff_name: "Mads", body: "Svar", created_at: "2026-11-19T08:04:00Z" }),
      ],
      [draft({ id: "auto", status: "auto_sent", final_body: "Svar fra Fiks", lookups: [{ tool: "quote_buyback" }] })],
    );
    expect(items.map((i) => i.kind)).toEqual(["customer", "fiks", "note", "staff"]);
    const fiks = items[1];
    expect(fiks.kind === "fiks" && fiks.basedOn).toBe("Bygger på: vejledende opkøbspris");
  });

  it("viser grunden fra et ventende udkast med needs_human som systemlinje til sidst", () => {
    const items = buildThreadItems([m({ id: "1" })], [draft({ needs_human: true, reason: "Kunden klager" })]);
    expect(items.at(-1)).toEqual({ kind: "system", id: "needs-d", text: "Fiks gav sagen videre. Grund: Kunden klager" });
  });

  it("tom besked fra Fiks uden udkast får ingen Bygger på-linje", () => {
    const items = buildThreadItems([m({ id: "2", sender: "staff", staff_name: "PhoneSpot assistent", body: "Hej" })], []);
    expect(items[0]).toMatchObject({ kind: "fiks", basedOn: null });
  });
});
