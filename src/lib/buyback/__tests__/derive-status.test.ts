import { describe, it, expect } from "vitest";
import { deriveTradeInStatus } from "@/lib/supabase/trade-in-types";

describe("deriveTradeInStatus with declines", () => {
  it("is afvist when a decline exists and there is no offer", () => {
    expect(deriveTradeInStatus("ny", [], [], [{ id: "d1" }])).toBe("afvist");
  });

  it("is afvist when a decline exists after a pending offer", () => {
    expect(deriveTradeInStatus("ny", [{ status: "pending" }], [], [{ id: "d1" }])).toBe("afvist");
  });

  it("keeps accepted ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [{ status: "accepted" }], [], [{ id: "d1" }])).toBe("accepteret");
  });

  it("keeps a received device ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [], [{ status: "draft" }], [{ id: "d1" }])).toBe("modtaget");
  });

  it("keeps a paid receipt ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [], [{ status: "paid" }], [{ id: "d1" }])).toBe("betalt");
  });

  it("behaves exactly as before when no declines are passed", () => {
    expect(deriveTradeInStatus("ny", [{ status: "pending" }], [])).toBe("tilbud_sendt");
    expect(deriveTradeInStatus("ny", [], [])).toBe("ny");
    expect(deriveTradeInStatus("lukket", [], [])).toBe("lukket");
    expect(deriveTradeInStatus("ny", [{ status: "rejected" }], [])).toBe("afvist");
  });
});
