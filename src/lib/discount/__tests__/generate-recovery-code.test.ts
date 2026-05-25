import { describe, it, expect, vi } from "vitest";

const inserted: Array<Record<string, unknown>> = [];

vi.mock("@supabase/supabase-js", () => ({}));

function makeAdmin() {
  return {
    from(_table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserted.push(row);
          return {
            select: () => ({ single: async () => ({ data: row, error: null }) }),
          };
        },
      };
    },
  };
}

import { generateRecoveryCode } from "../generate-recovery-code";

describe("generateRecoveryCode", () => {
  it("creates a 5% / 7-day / single-use percentage code", async () => {
    inserted.length = 0;
    const code = await generateRecoveryCode(makeAdmin() as never, {
      orderNumber: "S-1234",
    });
    expect(code).toMatch(/^KOM-TILBAGE-/);
    const row = inserted[0];
    expect(row.type).toBe("percentage");
    expect(row.value).toBe(5);
    expect(row.usage_limit).toBe(1);
    expect(row.is_active).toBe(true);
    const validUntil = new Date(row.valid_until as string);
    const sevenDays = Date.now() + 7 * 24 * 3600 * 1000;
    expect(Math.abs(validUntil.getTime() - sevenDays)).toBeLessThan(60_000);
  });

  it("appends a portion of the order number to keep codes distinguishable", async () => {
    inserted.length = 0;
    const code = await generateRecoveryCode(makeAdmin() as never, {
      orderNumber: "S-9999",
    });
    expect(code).toContain("9999");
  });
});
