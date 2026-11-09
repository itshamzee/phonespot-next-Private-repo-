import { describe, it, expect, vi } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  prepareUpload,
  scaleToFit,
  TOO_LARGE_MESSAGE,
  type CompressEnv,
} from "../_components/compress-image";

const MB = 1024 * 1024;
const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

/** Et lærred, hvor filstørrelsen følger kvaliteten: sizeAt(q) bytes. */
function fakeEnv(opts: {
  width?: number;
  height?: number;
  decodable?: boolean;
  sizeAt?: (q: number) => number;
}): CompressEnv & { renders: Array<{ w: number; h: number; q: number }> } {
  const renders: Array<{ w: number; h: number; q: number }> = [];
  return {
    renders,
    decode: vi.fn(async () =>
      opts.decodable === false ? null : { width: opts.width ?? 4000, height: opts.height ?? 3000, source: {} as CanvasImageSource },
    ),
    render: vi.fn(async (_s: CanvasImageSource, w: number, h: number, q: number) => {
      renders.push({ w, h, q });
      return new Blob([new Uint8Array((opts.sizeAt ?? (() => MB))(q))], { type: "image/jpeg" });
    }),
  };
}

describe("scaleToFit", () => {
  it("skalerer den lange side til højst 2000 px og bevarer forholdet", () => {
    expect(scaleToFit(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(scaleToFit(3000, 4000)).toEqual({ width: 1500, height: 2000 });
  });
  it("forstørrer aldrig små billeder", () => {
    expect(scaleToFit(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("prepareUpload", () => {
  it("gør et stort jpeg-foto til jpeg med 2000 px og kvalitet 0,8", async () => {
    const env = fakeEnv({});
    const res = await prepareUpload(file("IMG_1.JPEG", "image/jpeg", 6 * MB), env);
    if (!("file" in res)) throw new Error("expected file");
    expect(res.file.type).toBe("image/jpeg");
    expect(res.file.name).toBe("IMG_1.jpg");
    expect(env.renders).toEqual([{ w: 2000, h: 1500, q: 0.8 }]);
  });

  it("sænker kvaliteten trinvis, når resultatet stadig er over 4 MB", async () => {
    const env = fakeEnv({ sizeAt: (q) => (q > 0.65 ? 5 * MB : 3 * MB) });
    const res = await prepareUpload(file("a.png", "image/png", 9 * MB), env);
    expect("file" in res).toBe(true);
    const qs = env.renders.map((r) => r.q);
    expect(qs[0]).toBe(0.8);
    expect(qs[qs.length - 1]).toBeLessThan(0.7);
    expect(qs.every((q, i) => i === 0 || q < qs[i - 1])).toBe(true);
    expect(Math.min(...qs)).toBeGreaterThanOrEqual(0.5);
  });

  it("giver den danske fejl, når selv kvalitet 0,5 er for stor", async () => {
    const env = fakeEnv({ sizeAt: () => 6 * MB });
    const res = await prepareUpload(file("a.jpg", "image/jpeg", 9 * MB), env);
    expect(res).toEqual({ error: TOO_LARGE_MESSAGE });
    expect(Math.min(...env.renders.map((r) => r.q))).toBe(0.5);
  });

  it("sender PDF uændret, hvis den er højst 4 MB", async () => {
    const env = fakeEnv({});
    const pdf = file("seddel.pdf", "application/pdf", 2 * MB);
    const res = await prepareUpload(pdf, env);
    expect(res).toEqual({ file: pdf });
    expect(env.decode).not.toHaveBeenCalled();
  });

  it("afviser en PDF over 4 MB lokalt med serverens besked", async () => {
    const res = await prepareUpload(file("seddel.pdf", "application/pdf", MAX_UPLOAD_BYTES + 1), fakeEnv({}));
    expect(res).toEqual({ error: TOO_LARGE_MESSAGE });
    expect(TOO_LARGE_MESSAGE).toBe("Filen er for stor (maks. 4 MB). Tag billedet igen eller gem PDF'en mindre.");
  });

  it("sender HEIC uændret, når browseren ikke kan afkode den og filen er højst 4 MB", async () => {
    const env = fakeEnv({ decodable: false });
    const heic = file("IMG.heic", "image/heic", 3 * MB);
    expect(await prepareUpload(heic, env)).toEqual({ file: heic });
  });

  it("afviser HEIC over 4 MB, som browseren ikke kan afkode", async () => {
    const res = await prepareUpload(file("IMG.heic", "image/heic", 5 * MB), fakeEnv({ decodable: false }));
    expect(res).toEqual({ error: TOO_LARGE_MESSAGE });
  });

  it("afkoder HEIC, når browseren kan", async () => {
    const env = fakeEnv({});
    const res = await prepareUpload(file("IMG.heic", "image/heic", 5 * MB), env);
    expect("file" in res && res.file.type).toBe("image/jpeg");
  });
});
