import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  classifyTab,
  compareRows,
  groupRows,
  matchesSearch,
  normalizePhone,
  parseTicketNumber,
  pickupFor,
  tabCounts,
  toCaseRow,
  type CaseListTicket,
} from "../case-list";
import { buildCaseList, parseListParams } from "../case-query";

const base = (over: Partial<CaseListTicket>): CaseListTicket => ({
  id: "id-" + Math.random().toString(36).slice(2, 10),
  ticket_number: "PS-2026-0001",
  customer_name: "Anna Hansen",
  customer_phone: "20 12 34 56",
  device_model: "iPhone 13",
  issue_description: "Knust skærm",
  status: "modtaget",
  created_at: "2026-10-01T10:00:00Z",
  ...over,
});

describe("tabs", () => {
  it("classifies every ticket into exactly one tab and counts add up", () => {
    const tickets = [
      base({ status: "i_gang" }),
      base({ status: "faerdig" }),
      base({ status: "godkendt", on_hold_reason: "Venter på del" }),
      base({ status: "modtaget", booking_details: { preferred_date: "2026-10-06" } }),
      base({ status: "afhentet" }),
      base({ status: "i_gang", booking_details: {} }),
    ];
    expect(classifyTab(tickets[3])).toBe("web");
    expect(classifyTab(tickets[5])).toBe("igang"); // bookingen er allerede modtaget
    expect(tabCounts(tickets)).toEqual({ igang: 2, klar: 1, afventer: 1, web: 1, alle: 6 });
  });
});

describe("search normalization", () => {
  const t = base({
    ticket_number: "PS-2026-0042",
    customer_phone: "+45 20 12 34 56",
    customer_devices: { serial_number: "35 123456 789012 3" },
  });

  it("normalizes phone numbers", () => {
    expect(normalizePhone("+45 20 12 34 56")).toBe("20123456");
    expect(normalizePhone("0045 20123456")).toBe("20123456");
  });
  it("matches phone however it is typed", () => {
    expect(matchesSearch(t, "20123456")).toBe(true);
    expect(matchesSearch(t, "20 12 34 56")).toBe(true);
    expect(matchesSearch(t, "+4520123456")).toBe(true);
    expect(matchesSearch(t, "99999999")).toBe(false);
  });
  it("matches full PS number, short PS number and bare number", () => {
    expect(matchesSearch(t, "PS-2026-0042")).toBe(true);
    expect(matchesSearch(t, "ps-42")).toBe(true);
    expect(matchesSearch(t, "#42")).toBe(true);
    expect(matchesSearch(t, "42")).toBe(true);
    expect(matchesSearch(t, "0042")).toBe(true);
    expect(matchesSearch(t, "PS-2025-0042")).toBe(false);
    expect(matchesSearch(t, "43")).toBe(false);
    expect(parseTicketNumber("PS-2026-0042")).toEqual({ year: 2026, seq: 42 });
  });
  it("matches IMEI, name and description, all words required", () => {
    expect(matchesSearch(t, "351234567890123")).toBe(true);
    expect(matchesSearch(t, "anna skærm")).toBe(true);
    expect(matchesSearch(t, "anna batteri")).toBe(false);
  });
});

describe("pickup and grouping", () => {
  it("uses booking date, then quote estimate in business days, then created day", () => {
    expect(pickupFor(base({ booking_details: { preferred_date: "2026-10-06", preferred_time: "16:00" } }))).toMatchObject({
      date: "2026-10-06",
      time: "16:00",
      source: "booking",
    });
    expect(
      pickupFor(base({ created_at: "2026-10-02T10:00:00Z", repair_quotes: [{ estimated_days: 2, created_at: "2026-10-02" }] })),
    ).toMatchObject({ date: "2026-10-06", source: "estimate" });
    expect(pickupFor(base({}))).toMatchObject({ date: "2026-10-01", source: "created" });
    expect(addBusinessDays("2026-10-02", 1)).toBe("2026-10-05");
  });

  it("groups by pickup day with overdue on top, today by time, closed last", () => {
    const today = "2026-10-04";
    const rows = [
      base({ id: "a", booking_details: { preferred_date: "2026-10-04", preferred_time: "16:00" }, status: "i_gang" }),
      base({ id: "b", booking_details: { preferred_date: "2026-10-04", preferred_time: "14:00" }, status: "i_gang" }),
      base({ id: "c", booking_details: { preferred_date: "2026-10-05" }, status: "i_gang" }),
      base({ id: "d", booking_details: { preferred_date: "2026-10-01" }, status: "i_gang" }),
      base({ id: "e", booking_details: { preferred_date: "2026-10-02" }, status: "afhentet" }),
    ]
      .map(toCaseRow)
      .sort(compareRows);
    const groups = groupRows(rows, today);
    expect(groups.map((g) => g.label)).toEqual([
      "Forfaldne",
      "I dag, søndag 4. oktober",
      "I morgen, mandag 5. oktober",
      "Afsluttet, fredag 2. oktober",
    ]);
    expect(groups[1].rows.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("buildCaseList", () => {
  const tickets = Array.from({ length: 7 }, (_, i) =>
    base({ id: `t${i}`, ticket_number: `PS-2026-000${i + 1}`, created_at: `2026-10-0${i + 1}T10:00:00Z` }),
  );
  it("paginates server-side and counts the whole filtered set", () => {
    const res = buildCaseList(tickets, { tab: "igang", q: "", page: 2, pageSize: 3, assignee: null });
    expect(res.total).toBe(7);
    expect(res.rows).toHaveLength(3);
    expect(res.counts.igang).toBe(7);
  });
  it("search narrows the counts too", () => {
    const res = buildCaseList(tickets, { tab: "igang", q: "PS-2026-0003", page: 1, pageSize: 50, assignee: null });
    expect(res.rows.map((r) => r.id)).toEqual(["t2"]);
    expect(res.counts.alle).toBe(1);
  });
  it("parses params defensively", () => {
    expect(parseListParams(new URL("http://x/?tab=nonsense&page=-3&pageSize=9999"))).toMatchObject({
      tab: "igang",
      page: 1,
      pageSize: 100,
    });
  });
});
