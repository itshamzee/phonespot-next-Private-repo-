import { describe, expect, it } from "vitest";
import { productBounds, whitenBackground } from "../lightbox";

/** w×h RGBA-billede, hvor fill(x,y) giver farven. */
function image(w: number, h: number, fill: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  return data;
}

describe("whitenBackground", () => {
  it("lysner en grå lysboks til næsten hvid og bevarer varen mørkere", () => {
    const d = image(100, 100, (x, y) => (x >= 40 && x < 60 && y >= 40 && y < 60 ? [40, 40, 40] : [150, 150, 150]));
    const bg = whitenBackground(d, 100, 100);
    expect(bg[0]).toBeGreaterThanOrEqual(245);
    expect(d[0]).toBeGreaterThanOrEqual(245);
    expect(d[(50 * 100 + 50) * 4]).toBeLessThan(100);
  });

  it("fjerner et farvestik fra lyset", () => {
    const d = image(50, 50, () => [200, 210, 230]);
    whitenBackground(d, 50, 50);
    expect(Math.abs(d[0] - d[2])).toBeLessThanOrEqual(2);
  });
});

describe("productBounds", () => {
  it("finder varen og ignorerer enkelte fnug", () => {
    const d = image(200, 200, (x, y) => {
      if (x >= 60 && x < 140 && y >= 50 && y < 170) return [120, 120, 120];
      if (x === 10 && y === 190) return [0, 0, 0];
      return [248, 248, 248];
    });
    const b = productBounds(d, 200, 200, [248, 248, 248]);
    expect(b.x).toBeGreaterThanOrEqual(55);
    expect(b.x).toBeLessThanOrEqual(60);
    expect(b.x + b.w).toBeGreaterThanOrEqual(140);
    expect(b.x + b.w).toBeLessThanOrEqual(145);
    expect(b.y).toBeLessThanOrEqual(50);
    expect(b.y + b.h).toBeLessThanOrEqual(176);
  });

  it("bruger hele billedet, hvis der ikke er nogen vare", () => {
    const d = image(80, 80, () => [248, 248, 248]);
    expect(productBounds(d, 80, 80, [248, 248, 248])).toEqual({ x: 0, y: 0, w: 80, h: 80 });
  });
});
