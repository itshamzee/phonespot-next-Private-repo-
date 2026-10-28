import { describe, expect, it } from "vitest";
import { lightboxAlpha } from "../lightbox";

/** w×h RGBA-billede fyldt med farve, hvor fill(x,y) kan overskrive. */
function image(w: number, h: number, fill: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  return data;
}
const alphaAt = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];

describe("lightboxAlpha", () => {
  it("gør den lyse baggrund gennemsigtig og beholder varen", () => {
    const d = image(20, 20, (x, y) => (x >= 6 && x < 14 && y >= 6 && y < 14 ? [30, 30, 30] : [246, 247, 245]));
    lightboxAlpha(d, 20, 20);
    expect(alphaAt(d, 20, 0, 0)).toBe(0);
    expect(alphaAt(d, 20, 19, 19)).toBe(0);
    expect(alphaAt(d, 20, 10, 10)).toBe(255);
  });

  it("beholder et hvidt cover, der er omgivet af en kant (ikke forbundet med baggrunden)", () => {
    const d = image(20, 20, (x, y) => {
      const inBox = x >= 5 && x < 15 && y >= 5 && y < 15;
      const edge = inBox && (x === 5 || x === 14 || y === 5 || y === 14);
      return edge ? [120, 120, 120] : [250, 250, 250];
    });
    lightboxAlpha(d, 20, 20);
    expect(alphaAt(d, 20, 1, 1)).toBe(0);
    expect(alphaAt(d, 20, 10, 10)).toBe(255);
  });

  it("tåler en let grå/ujævn lysboks", () => {
    const d = image(20, 20, (x, y) => (x >= 8 && x < 12 && y >= 8 && y < 12 ? [200, 30, 30] : [228 + (x % 3), 230, 226 + (y % 4)]));
    lightboxAlpha(d, 20, 20);
    expect(alphaAt(d, 20, 2, 17)).toBe(0);
    expect(alphaAt(d, 20, 9, 9)).toBe(255);
  });
});
