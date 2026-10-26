import { describe, expect, it } from "vitest";
import { dayLabel, groupWebBookings, splitWebBookings, staleCutoff, type WebBookingRaw } from "../web-bookings";

const NOW = new Date("2026-10-26T13:00:00Z");
const TODAY = "2026-10-26";

function booking(over: Partial<WebBookingRaw> & { date?: string | null; time?: string | null }): WebBookingRaw {
  const { date, time, ...rest } = over;
  return {
    id: rest.id ?? "id",
    ticket_number: "PS-2026-0001",
    customer_name: "Mathias Larsen",
    device_model: "Pixel 9 Pro XL",
    service_type: "Reparation",
    store_id: "vejle",
    created_at: "2026-10-24T13:28:19Z",
    booking_details: {
      preferred_date: date === undefined ? TODAY : date,
      preferred_time: time === undefined ? "16:00-18:00" : time,
      selected_services: [{ name: "Skærmskift (Original)", price_dkk: 2399 }],
      total_price_dkk: 2399,
    },
    ...rest,
  };
}

describe("dayLabel", () => {
  it("giver ugedag og dansk dato", () => {
    expect(dayLabel("2026-10-29")).toBe("Torsdag 29. okt.");
    expect(dayLabel("2026-10-27")).toBe("Tirsdag 27. okt.");
  });
});

describe("groupWebBookings", () => {
  it("lægger fremtidige bookinger i egne dage, så de ses med det samme", () => {
    const groups = groupWebBookings(
      [
        booking({ id: "c", date: "2026-10-29", time: "12:00-14:00" }),
        booking({ id: "b", date: "2026-10-27" }),
        booking({ id: "a", date: TODAY, time: "10:00-12:00" }),
      ],
      TODAY,
      NOW,
    );
    expect(groups.map((g) => g.kind)).toEqual(["idag", "imorgen", "senere"]);
    expect(groups[1].label).toBe("I morgen, tirsdag 27. okt.");
    expect(groups[2].label).toBe("Torsdag 29. okt.");
    expect(groups[0].items[0].time).toBe("10.00–12.00");
  });

  it("samler overskredne bookinger øverst og viser dagen", () => {
    const groups = groupWebBookings(
      [booking({ id: "x", date: TODAY }), booking({ id: "old", date: "2026-10-21", time: null })],
      TODAY,
      NOW,
    );
    expect(groups[0].kind).toBe("overskredet");
    expect(groups[0].items[0].time).toBe("Onsdag 21. okt.");
  });

  it("sorterer efter tidsrum inden for samme dag og lægger bookinger uden dato sidst", () => {
    const groups = groupWebBookings(
      [
        booking({ id: "sen", time: "16:00-18:00" }),
        booking({ id: "tidlig", time: "10:00-12:00" }),
        booking({ id: "nodate", date: null }),
      ],
      TODAY,
      NOW,
    );
    expect(groups[0].items.map((i) => i.id)).toEqual(["tidlig", "sen"]);
    expect(groups.at(-1)?.kind).toBe("udendato");
  });

  it("viser kunde, ydelse, pris og butik og markerer nye bookinger", () => {
    const [group] = groupWebBookings([booking({ id: "n", created_at: "2026-10-26T09:00:00Z" })], TODAY, NOW);
    const item = group.items[0];
    expect(item.customer).toBe("Mathias Larsen");
    expect(item.title).toBe("Pixel 9 Pro XL · Skærmskift (Original)");
    expect(item.price).toBe("2.399 kr.");
    expect(item.store).toBe("Vejle");
    expect(item.isNew).toBe(true);
  });

  it("markerer ikke en booking fra for to dage siden som ny", () => {
    const [group] = groupWebBookings([booking({ id: "o" })], TODAY, NOW);
    expect(group.items[0].isNew).toBe(false);
  });
});

describe("splitWebBookings", () => {
  it("tæller bookinger over 14 dage gamle for sig, så de ikke drukner de nye", () => {
    expect(staleCutoff(TODAY)).toBe("2026-10-12");
    const { groups, stale } = splitWebBookings(
      [
        booking({ id: "ny", date: "2026-10-27" }),
        booking({ id: "overskredet", date: "2026-10-20" }),
        booking({ id: "glemt", date: "2026-09-01" }),
        booking({ id: "glemt-uden-dato", date: null, created_at: "2026-04-01T10:00:00Z" }),
      ],
      TODAY,
      NOW,
    );
    expect(stale).toBe(2);
    expect(groups.flatMap((g) => g.items.map((i) => i.id))).toEqual(["overskredet", "ny"]);
  });
});
