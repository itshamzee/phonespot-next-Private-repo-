import { describe, it, expect } from "vitest";
import {
  buildInboxRows,
  inboxState,
  matchesView,
  needsAnswer,
  sortFolderRows,
  viewCounts,
  waitingLabel,
  type InboxRow,
  type InboxView,
} from "@/lib/inquiries/inbox";

const NOW = new Date("2026-11-19T12:00:00Z");

function row(over: Partial<InboxRow> = {}): InboxRow {
  return {
    id: "i1",
    name: "Kunde",
    subject: "Emne",
    preview: "Hej",
    channel: "email",
    mailbox: "info@phonespot.dk",
    store: null,
    status: "ny",
    assignedTo: null,
    assignedName: null,
    snoozedUntil: null,
    lastInboundAt: "2026-11-19T11:00:00Z",
    needsHuman: false,
    needsHumanReason: null,
    hasDraft: false,
    fiksAnswered: false,
    isPublic: false,
    source: "email",
    ...over,
  };
}

describe("inboxState", () => {
  it("mapper status til tilstand", () => {
    expect(inboxState(row({ status: "ny" }), NOW)).toBe("open");
    expect(inboxState(row({ status: "venter_paa_svar" }), NOW)).toBe("open");
    expect(inboxState(row({ status: "besvaret" }), NOW)).toBe("waiting");
    expect(inboxState(row({ status: "lukket" }), NOW)).toBe("done");
  });
  it("udsat i fremtiden er snoozed, i fortiden den underliggende tilstand", () => {
    expect(inboxState(row({ snoozedUntil: "2026-11-20T08:00:00Z" }), NOW)).toBe("snoozed");
    expect(inboxState(row({ snoozedUntil: "2026-11-19T08:00:00Z" }), NOW)).toBe("open");
    expect(inboxState(row({ status: "besvaret", snoozedUntil: "2026-11-18T08:00:00Z" }), NOW)).toBe("waiting");
  });
  it("lukket sag er aldrig udsat", () => {
    expect(inboxState(row({ status: "lukket", snoozedUntil: "2026-11-20T08:00:00Z" }), NOW)).toBe("done");
  });
});

describe("matchesView", () => {
  const me = "me";
  const m = (v: InboxView, r: InboxRow) => matchesView(v, r, me, NOW);

  it("mine", () => {
    expect(m("mine", row({ assignedTo: me }))).toBe(true);
    expect(m("mine", row({ assignedTo: "other" }))).toBe(false);
    expect(m("mine", row({ assignedTo: me, status: "lukket" }))).toBe(false);
  });
  it("unassigned", () => {
    expect(m("unassigned", row())).toBe(true);
    expect(m("unassigned", row({ assignedTo: "x" }))).toBe(false);
    expect(m("unassigned", row({ fiksAnswered: true }))).toBe(false);
    expect(m("unassigned", row({ snoozedUntil: "2026-11-20T08:00:00Z" }))).toBe(false);
  });
  it("need", () => {
    expect(m("need", row({ needsHuman: true }))).toBe(true);
    expect(m("need", row({ needsHuman: false }))).toBe(false);
    expect(m("need", row({ needsHuman: true, status: "lukket" }))).toBe(false);
  });
  it("waiting", () => {
    expect(m("waiting", row({ status: "besvaret" }))).toBe(true);
    expect(m("waiting", row())).toBe(false);
  });
  it("snoozed", () => {
    expect(m("snoozed", row({ snoozedUntil: "2026-11-20T08:00:00Z" }))).toBe(true);
    expect(m("snoozed", row())).toBe(false);
  });
  it("fiks", () => {
    expect(m("fiks", row({ fiksAnswered: true, status: "besvaret" }))).toBe(true);
    expect(m("fiks", row())).toBe(false);
    expect(m("fiks", row({ fiksAnswered: true, status: "lukket" }))).toBe(false);
  });
  it("done: kun lukkede", () => {
    expect(m("done", row({ status: "lukket" }))).toBe(true);
    expect(m("done", row())).toBe(false);
  });
  it("kanalvisninger", () => {
    expect(m("ch-mail", row({ channel: "email" }))).toBe(true);
    expect(m("ch-mail", row({ channel: "sms" }))).toBe(false);
    expect(m("ch-sms", row({ channel: "sms" }))).toBe(true);
    expect(m("ch-messenger", row({ channel: "messenger" }))).toBe(true);
    expect(m("ch-form", row({ channel: "form" }))).toBe(true);
    expect(m("ch-form", row({ channel: "email" }))).toBe(false);
    expect(m("ch-chat", row())).toBe(false);
  });
  it("anmeldelse er i ch-reviews", () => {
    expect(m("ch-reviews", row({ channel: "google_review", isPublic: true }))).toBe(true);
    expect(m("ch-reviews", row({ channel: "trustpilot_review", isPublic: true }))).toBe(true);
    expect(m("ch-reviews", row({ channel: "email" }))).toBe(false);
  });
  it("lukket række er kun i done", () => {
    const closed = row({ status: "lukket", assignedTo: me, needsHuman: true, channel: "email", fiksAnswered: true });
    const views: InboxView[] = ["mine", "unassigned", "need", "waiting", "snoozed", "fiks", "ch-mail", "ch-chat", "ch-messenger", "ch-sms", "ch-form", "ch-reviews"];
    for (const v of views) expect(m(v, closed), v).toBe(false);
    expect(m("done", closed)).toBe(true);
  });
});

describe("viewCounts", () => {
  it("tæller mine, ledige og behov", () => {
    const rows = [
      row({ id: "a", assignedTo: "me" }),
      row({ id: "b" }),
      row({ id: "c", needsHuman: true }),
      row({ id: "d", fiksAnswered: true }),
      row({ id: "e", status: "lukket" }),
    ];
    expect(viewCounts(rows, "me", NOW)).toEqual({ mine: 1, unassigned: 2, need: 1 });
  });
});

describe("waitingLabel", () => {
  const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
  it("null giver tankestreg", () => {
    expect(waitingLabel(null, NOW)).toEqual({ text: "–", long: false });
  });
  it("minutter", () => {
    expect(waitingLabel(ago(59), NOW)).toEqual({ text: "59 min", long: false });
  });
  it("timer og minutter under 6 timer", () => {
    expect(waitingLabel(ago(61), NOW)).toEqual({ text: "1 t 1 min", long: false });
    expect(waitingLabel(ago(5 * 60 + 59), NOW)).toEqual({ text: "5 t 59 min", long: true });
    expect(waitingLabel(ago(120), NOW)).toEqual({ text: "2 t", long: false });
  });
  it("timer under 24", () => {
    expect(waitingLabel(ago(7 * 60), NOW)).toEqual({ text: "7 t", long: true });
  });
  it("i går, ugedag og dato", () => {
    expect(waitingLabel("2026-11-18T09:00:00Z", NOW)).toEqual({ text: "i går", long: true });
    expect(waitingLabel("2026-11-13T09:00:00Z", NOW)).toEqual({ text: "fredag", long: true });
    expect(waitingLabel("2026-10-01T09:00:00Z", NOW).text).toMatch(/^1\. okt/);
  });
});

describe("buildInboxRows", () => {
  const inq = (over: Record<string, unknown> = {}) => ({
    id: "i1",
    name: "Kunde",
    subject: "Emne",
    message: "Første besked",
    channel: "email",
    mailbox: "info@phonespot.dk",
    store_id: "vejle",
    status: "ny",
    assigned_to: null,
    assigned_name: null,
    snoozed_until: null,
    last_inbound_at: "2026-11-19T10:00:00Z",
    source: "email",
    ...over,
  });
  const draft = (over: Record<string, unknown> = {}) => ({
    id: "d1",
    inquiry_id: "i1",
    status: "pending",
    needs_human: false,
    reason: "",
    draft_body: "Svar",
    created_at: "2026-11-19T10:01:00Z",
    sent_at: null,
    ...over,
  });

  it("bruger seneste ikke-interne besked som preview", () => {
    const rows = buildInboxRows(
      [inq()] as never,
      [
        { inquiry_id: "i1", sender: "customer", body: "Gammel", is_internal: false, created_at: "2026-11-19T09:00:00Z" },
        { inquiry_id: "i1", sender: "staff", body: "Intern note", is_internal: true, created_at: "2026-11-19T10:30:00Z" },
        { inquiry_id: "i1", sender: "customer", body: "Nyeste  \n besked", is_internal: false, created_at: "2026-11-19T10:00:00Z" },
      ] as never,
      [],
    );
    expect(rows[0].preview).toBe("Nyeste besked");
    expect(rows[0].store).toBe("vejle");
  });
  it("falder tilbage til første besked", () => {
    expect(buildInboxRows([inq()] as never, [], [])[0].preview).toBe("Første besked");
  });
  it("needsHuman og hasDraft kommer fra ventende udkast", () => {
    const [r] = buildInboxRows([inq()] as never, [], [draft({ needs_human: true, reason: "Reklamation" })] as never);
    expect(r).toMatchObject({ needsHuman: true, needsHumanReason: "Reklamation", hasDraft: true, fiksAnswered: false });
    const [r2] = buildInboxRows([inq()] as never, [], [draft({ status: "discarded", needs_human: true })] as never);
    expect(r2).toMatchObject({ needsHuman: false, hasDraft: false });
  });
  it("fiksAnswered når seneste udkast er auto_sent og ingen nyere kundebesked", () => {
    const d = draft({ status: "auto_sent", created_at: "2026-11-19T10:01:00Z" });
    expect(buildInboxRows([inq({ status: "besvaret" })] as never, [], [d] as never)[0].fiksAnswered).toBe(true);
    const newer = [{ inquiry_id: "i1", sender: "customer", body: "Tak, men...", is_internal: false, created_at: "2026-11-19T11:00:00Z" }];
    expect(buildInboxRows([inq()] as never, newer as never, [d] as never)[0].fiksAnswered).toBe(false);
    expect(
      buildInboxRows([inq({ last_inbound_at: "2026-11-19T11:30:00Z" })] as never, [], [d] as never)[0].fiksAnswered,
    ).toBe(false);
  });
  it("anmeldelse er offentlig", () => {
    expect(buildInboxRows([inq({ channel: "google_review" })] as never, [], [])[0].isPublic).toBe(true);
    expect(buildInboxRows([inq()] as never, [], [])[0].isPublic).toBe(false);
  });
  it("blander ikke udkast mellem tråde", () => {
    const rows = buildInboxRows([inq(), inq({ id: "i2" })] as never, [], [draft({ inquiry_id: "i2", needs_human: true })] as never);
    expect(rows.map((r) => r.needsHuman)).toEqual([false, true]);
  });
});

describe("mapper", () => {
  it("opkøb og postkasser viser alt, der ikke er færdigt", () => {
    const opk = row({ source: "saelg-enhed", channel: "form", mailbox: null, status: "besvaret" });
    expect(matchesView("opkoeb", opk, "me", NOW)).toBe(true);
    expect(matchesView("opkoeb", row({ source: "saelg-enhed", status: "lukket" }), "me", NOW)).toBe(false);
    expect(matchesView("opkoeb", row(), "me", NOW)).toBe(false);
    expect(matchesView("mb-ha", row({ mailbox: "HA@phonespot.dk" }), "me", NOW)).toBe(true);
    expect(matchesView("mb-ha", row({ mailbox: "info@phonespot.dk" }), "me", NOW)).toBe(false);
    expect(matchesView("mb-info", row(), "me", NOW)).toBe(true);
    expect(matchesView("mb-slagelse", row({ mailbox: null }), "me", NOW)).toBe(false);
    expect(matchesView("ch-chat", row({ channel: "chat" as InboxRow["channel"], mailbox: null, status: "besvaret" }), "me", NOW)).toBe(true);
    expect(matchesView("ch-chat", row(), "me", NOW)).toBe(false);
  });

  it("sorterer skal besvares øverst, også et overset kundesvar, derefter nyeste først", () => {
    const rows = [
      row({ id: "venter-ny", status: "besvaret", lastInboundAt: "2026-11-19T10:00:00Z" }),
      row({ id: "aaben-gammel", status: "ny", lastInboundAt: "2026-11-10T10:00:00Z" }),
      row({ id: "overset", status: "besvaret", customerLast: true, lastInboundAt: "2026-11-15T10:00:00Z" }),
      row({ id: "venter-gammel", status: "besvaret", lastInboundAt: "2026-11-01T10:00:00Z" }),
    ];
    expect(sortFolderRows(rows, NOW).map((r) => r.id)).toEqual(["overset", "aaben-gammel", "venter-ny", "venter-gammel"]);
    expect(needsAnswer(rows[2], NOW)).toBe(true);
    expect(needsAnswer(rows[0], NOW)).toBe(false);
  });

  it("customerLast følger den nyeste ikke-interne besked", () => {
    const base = { id: "q", name: "A", subject: null, message: "m", channel: "form" as const, mailbox: null, store_id: null, status: "besvaret" as const, assigned_to: null, assigned_name: null, snoozed_until: null, last_inbound_at: null, source: "saelg-enhed" };
    const msgs = [
      { inquiry_id: "q", sender: "staff" as const, body: "tilbud", created_at: "2026-11-01T10:00:00Z" },
      { inquiry_id: "q", sender: "customer" as const, body: "ja tak", created_at: "2026-11-02T10:00:00Z" },
      { inquiry_id: "q", sender: "staff" as const, body: "note", is_internal: true, created_at: "2026-11-03T10:00:00Z" },
    ];
    expect(buildInboxRows([base], msgs, [])[0].customerLast).toBe(true);
    expect(buildInboxRows([base], msgs.slice(0, 1), [])[0].customerLast).toBe(false);
    expect(buildInboxRows([base], [], [])[0].customerLast).toBe(false);
  });
});
