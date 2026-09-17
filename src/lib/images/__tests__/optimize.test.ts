// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { optimizeProductImage, MAX_EDGE } from "../optimize";

async function png(width: number, height: number, alpha = false) {
  return sharp({ create: { width, height, channels: alpha ? 4 : 3, background: alpha ? { r: 20, g: 20, b: 20, alpha: 0 } : { r: 240, g: 240, b: 238 } } })
    .png({ compressionLevel: 0 })
    .toBuffer();
}

describe("optimizeProductImage", () => {
  it("laver store billeder om til WebP på højst MAX_EDGE px og gør dem mindre", async () => {
    const input = await png(3000, 2000);
    const out = await optimizeProductImage(input, "image/png");
    expect(out.contentType).toBe("image/webp");
    expect(out.ext).toBe("webp");
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBe(MAX_EDGE);
    expect(meta.width! / meta.height!).toBeCloseTo(1.5, 1);
    expect(out.data.length).toBeLessThan(input.length);
  });

  it("forstørrer ikke små billeder og bevarer gennemsigtighed", async () => {
    const out = await optimizeProductImage(await png(400, 400, true), "image/png");
    const meta = await sharp(out.data).metadata();
    expect(meta.width).toBe(400);
    expect(meta.hasAlpha).toBe(true);
  });

  it("falder tilbage til originalen, hvis filen ikke kan læses som billede", async () => {
    const broken = Buffer.from("ikke et billede");
    const out = await optimizeProductImage(broken, "image/jpeg");
    expect(out.data).toBe(broken);
    expect(out.contentType).toBe("image/jpeg");
    expect(out.ext).toBe("jpg");
  });
});
