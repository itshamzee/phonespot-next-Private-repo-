import { describe, it, expect, vi } from "vitest";
import { buildDigest, digestSender, groupWaiting, isDigestMail, isDigestReply, waitingDays, type DigestItem } from "@/lib/mail-agent/digest";
import type { InboxEntry } from "@/lib/mail-agent/folders";

vi.mock("@/lib/inquiries/send-reply", () => ({ sendInquiryReply: vi.fn() }));
import { parseSimple, sanitizeDecisions, stripQuoted } from "@/lib/mail-agent/digest-reply";

const entry = (over: Partial<InboxEntry>): InboxEntry => ({
  uid: 1, messageId: "<1@x>", counterpart: "kunde@gmail.com", fromEmail: "kunde@gmail.com", subject: "Hej", date: new Date("2026-11-10T10:00:00Z"), answered: false, seen: false, ...over,
});

const item = (over: Partial<DigestItem>): DigestItem => ({
  n: 1, mailbox: "info@phonespot.dk", email: "kunde@gmail.com", name: "Kunde Hansen", uids: [1], messageIds: ["<1@x>"], subject: "Status", waitingSince: "2026-11-10T10:00:00Z",
  category: "ordre", summary: "Spørger til status på ordre", inquiryId: "inq-1", draftId: "d-1", draftBody: "Din ordre er afsendt.\n\nVenlig hilsen", contactNotice: false, ...over,
});

describe("groupWaiting", () => {
  it("makes one point per person from unread mail, oldest mail first", () => {
    const groups = groupWaiting("info@phonespot.dk", [
      entry({ uid: 2, messageId: "<2@x>", date: new Date("2026-11-12T10:00:00Z"), subject: "Rykker" }),
      entry({ uid: 1 }),
      entry({ uid: 3, counterpart: "anden@gmail.com", fromEmail: "anden@gmail.com", seen: true }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ email: "kunde@gmail.com", uids: [1, 2], subject: "Rykker", waitingSince: "2026-11-10T10:00:00.000Z", contactNotice: false });
  });

  it("includes contact-form questions under the customer, and skips our own mail and digests", () => {
    const groups = groupWaiting("slagelse@phonespot.dk", [
      entry({ uid: 5, fromEmail: "noreply@phonespot.dk", counterpart: "form@gmail.com", subject: "Kontakt (Slagelse): Support" }),
      entry({ uid: 6, fromEmail: "wec@phonespot.dk", counterpart: "wec@phonespot.dk", subject: "Fwd: Telefoner" }),
      entry({ uid: 7, fromEmail: "info@phonespot.dk", counterpart: "info@phonespot.dk", subject: "Mailoverblik fre. 13. nov.: 3 venter på svar" }),
    ]);
    expect(groups.map((g) => g.email)).toEqual(["form@gmail.com"]);
    expect(groups[0].contactNotice).toBe(true);
  });
});

describe("digest recognition", () => {
  it("knows its own overviews but not the owner's reply to one", () => {
    expect(isDigestMail({ fromEmail: "info@phonespot.dk", subject: "Mailoverblik fre. 13. nov.: 3 venter på svar" })).toBe(true);
    expect(isDigestMail({ fromEmail: "ha@phonespot.dk", subject: "Re: Mailoverblik fre. 13. nov.: 3 venter på svar" })).toBe(false);
    expect(isDigestMail({ fromEmail: "fremmed@evil.dk", subject: "Mailoverblik" })).toBe(false);
  });

  it("only treats mail from the owner that answers something as a possible reply", () => {
    expect(isDigestReply({ fromEmail: "HA@phonespot.dk", inReplyTo: "<overblik-1@phonespot.dk>", references: [] }, "ha@phonespot.dk")).toBe(true);
    expect(isDigestReply({ fromEmail: "ha@phonespot.dk", inReplyTo: null, references: [] }, "ha@phonespot.dk")).toBe(false);
    expect(isDigestReply({ fromEmail: "kunde@gmail.com", inReplyTo: "<overblik-1@phonespot.dk>", references: [] }, "ha@phonespot.dk")).toBe(false);
  });

  it("sends from info@, never from the recipient's own mailbox", () => {
    const box = (address: string) => ({ address, localPart: address.split("@")[0], password: "x", displayName: "PhoneSpot", storeId: null });
    expect(digestSender([box("ha@phonespot.dk"), box("info@phonespot.dk")], "ha@phonespot.dk")?.address).toBe("info@phonespot.dk");
    expect(digestSender([box("ha@phonespot.dk")], "ha@phonespot.dk")).toBeNull();
  });
});

describe("buildDigest", () => {
  const now = new Date("2026-11-13T06:30:00Z");
  const activity = { inbound: [{ mailbox: "info@phonespot.dk", count: 7 }, { mailbox: "slagelse@phonespot.dk", count: 2 }], sent: [{ mailbox: "info@phonespot.dk", count: 4 }] };

  it("numbers the points and shows the exact draft the owner approves", () => {
    const mail = buildDigest([item({}), item({ n: 2, email: "b@x.dk", name: null, draftId: null, draftBody: null, summary: null, subject: "Pris?" })], activity, now);
    expect(mail.subject).toBe("Mailoverblik fre. 13. nov.: 2 venter på svar");
    expect(mail.text).toContain("Seneste døgn: 9 (info@ 7, slagelse@ 2) henvendelser ind, 4 mails ud.");
    expect(mail.text).toContain("1. Kunde Hansen <kunde@gmail.com> · info@ · ventet 2 dage · Ordre");
    expect(mail.text).toContain("   | Din ordre er afsendt.");
    expect(mail.text).toContain("2. b@x.dk");
    expect(mail.text).toContain("Intet udkast.");
    expect(mail.html).toContain("Din ordre er afsendt.");
  });

  it("escapes customer text in the html", () => {
    const mail = buildDigest([item({ summary: "<script>x</script>" })], activity, now);
    expect(mail.html).not.toContain("<script>");
  });

  it("says so when nobody is waiting", () => {
    const mail = buildDigest([], activity, now);
    expect(mail.subject).toContain("ingen venter på svar");
    expect(mail.text).toContain("Ingen venter på svar.");
  });

  it("counts whole days", () => {
    expect(waitingDays("2026-11-10T10:00:00Z", now.getTime())).toBe(2);
    expect(waitingDays("2026-11-13T05:00:00Z", now.getTime())).toBe(0);
  });
});

describe("stripQuoted", () => {
  it("keeps only what the owner wrote above the quoted overview", () => {
    const text = "1 ok, 2 luk\n3: skriv at vi ringer i morgen\n\nDen 13.11.2026 kl. 07.30 skrev PhoneSpot mailoverblik:\n> Godmorgen.\n> 1. Kunde";
    expect(stripQuoted(text)).toBe("1 ok, 2 luk\n3: skriv at vi ringer i morgen");
    expect(stripQuoted("alle ok\n> 1. Kunde\n> 2. Anden")).toBe("alle ok");
    expect(stripQuoted("1 ok\n\n-----Original Message-----\nFrom: x")).toBe("1 ok");
  });
});

describe("parseSimple", () => {
  const items = [item({}), item({ n: 2 }), item({ n: 3, draftId: null, draftBody: null }), item({ n: 4 }), item({ n: 5 })];

  it("reads ok, luk, ranges and lists without a model", () => {
    expect(parseSimple("1 ok, 2 luk", items)).toEqual({ decisions: [{ n: 1, action: "send" }, { n: 2, action: "close" }], complete: true });
    expect(parseSimple("1-2 ok\n4 og 5 luk", items).decisions).toEqual([{ n: 1, action: "send" }, { n: 2, action: "send" }, { n: 4, action: "close" }, { n: 5, action: "close" }]);
    expect(parseSimple("1 ok 2 ok 4 luk", items).decisions.map((d) => `${d.n}${d.action}`)).toEqual(["1send", "2send", "4close"]);
    expect(parseSimple("1: OK.", items).decisions).toEqual([{ n: 1, action: "send" }]);
  });

  it("takes free text after a number as an instruction for a new draft", () => {
    const r = parseSimple("1 ok, 3: skriv at vi ringer i morgen, og beklag ventetiden", items);
    expect(r.complete).toBe(true);
    expect(r.decisions).toEqual([{ n: 1, action: "send" }, { n: 3, action: "rewrite", instruction: "skriv at vi ringer i morgen, og beklag ventetiden" }]);
  });

  it("sends every shown draft on 'alle ok' and the remaining ones on 'resten ok'", () => {
    expect(parseSimple("alle ok", items).decisions.map((d) => d.n)).toEqual([1, 2, 4, 5]);
    expect(parseSimple("2 luk, resten ok", items).decisions).toEqual([{ n: 2, action: "close" }, { n: 1, action: "send" }, { n: 4, action: "send" }, { n: 5, action: "send" }]);
  });

  it("ignores small talk but flags decisions it cannot place", () => {
    expect(parseSimple("Hej\n1 ok\nTak for det", items)).toEqual({ decisions: [{ n: 1, action: "send" }], complete: true });
    expect(parseSimple("alle ok undtagen 4", items).complete).toBe(false);
    expect(parseSimple("alle luk", items)).toEqual({ decisions: [], complete: false });
    expect(parseSimple("1 og 2: skriv noget pænt", items).complete).toBe(false);
  });
});

describe("sanitizeDecisions", () => {
  const items = [item({}), item({ n: 2, draftId: null, draftBody: null }), item({ n: 3, draftId: null, draftBody: null, inquiryId: null })];

  it("keeps valid decisions and drops unknown numbers and repeats", () => {
    const { decisions } = sanitizeDecisions([{ n: 1, action: "send" }, { n: 1, action: "close" }, { n: 9, action: "send" }, { n: 3, action: "close" }, { n: 2, action: "delete" }], items);
    expect(decisions).toEqual([{ n: 1, action: "send" }, { n: 3, action: "close" }]);
  });

  it("never sends where the owner has not seen a draft", () => {
    const { decisions, notes } = sanitizeDecisions([{ n: 2, action: "send" }], items);
    expect(decisions).toEqual([]);
    expect(notes[0]).toMatch(/intet udkast/);
  });

  it("turns an instruction into a new draft, but only where there is a thread to answer on", () => {
    const { decisions, notes } = sanitizeDecisions([{ n: 2, action: "send", instruction: "vi ringer i morgen" }, { n: 3, action: "rewrite", instruction: "sig nej tak" }, { n: 1, action: "rewrite" }], items);
    expect(decisions).toEqual([{ n: 2, action: "rewrite", instruction: "vi ringer i morgen" }]);
    expect(notes[0]).toMatch(/Thunderbird/);
  });

  it("survives garbage from the model", () => {
    expect(sanitizeDecisions("nonsense", items).decisions).toEqual([]);
    expect(sanitizeDecisions([null, 4, { n: "1", action: "send" }], items).decisions).toEqual([{ n: 1, action: "send" }]);
  });
});
