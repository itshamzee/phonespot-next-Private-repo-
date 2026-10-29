import { describe, expect, it } from "vitest";
import { boxLabel, boxesLabel } from "../boxes";

describe("kassenumre", () => {
  it("formaterer kassenumre", () => {
    expect(boxLabel(1)).toBe("Kasse 01");
    expect(boxLabel(12)).toBe("Kasse 12");
    expect(boxesLabel([])).toBe("Ingen kasse");
    expect(boxesLabel([3, 1])).toBe("Kasse 01, 03");
  });
});
