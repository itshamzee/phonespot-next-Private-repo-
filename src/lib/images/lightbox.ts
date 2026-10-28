/**
 * Lysboksfotos → ensartede produktbilleder uden fritlægning. Ren pixelbehandling
 * (under et sekund selv på en gammel telefon):
 *  1. baggrundens farve måles i billedets kant, og billedet lysnes pr. kanal, så
 *     baggrunden bliver hvid (fjerner også farvestik fra lyset)
 *  2. varens afgrænsning findes som de pixels, der tydeligt afviger fra baggrunden
 *  3. udsnittet centreres på et kvadratisk lærred i baggrundens farve
 * Der skæres intet væk fra varen, så transparente og hvide covers bevarer deres
 * kanter og naturlige skygge.
 */

const SIZE = 1200;
const FILL = 0.82; // varen fylder højst 82 % af den længste side
const TARGET = 248; // baggrundens lysstyrke efter justering
const DIFF = 38; // afvigelse fra baggrunden, der tæller som vare

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 255;
}

/** Baggrundsfarve målt langs billedets kant. */
export function borderColor(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    r.push(data[i]);
    g.push(data[i + 1]);
    b.push(data[i + 2]);
  };
  const sx = Math.max(1, Math.floor(width / 80));
  const sy = Math.max(1, Math.floor(height / 80));
  for (let x = 0; x < width; x += sx) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y += sy) {
    add(0, y);
    add(width - 1, y);
  }
  return [median(r), median(g), median(b)];
}

/** Lysner billedet på stedet, så baggrunden rammer TARGET. Returnerer den nye baggrundsfarve. */
export function whitenBackground(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const bg = borderColor(data, width, height);
  const gain = bg.map((c) => Math.min(2.2, Math.max(1, TARGET / Math.max(1, c))));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] * gain[0];
    data[i + 1] = data[i + 1] * gain[1];
    data[i + 2] = data[i + 2] * gain[2];
  }
  return bg.map((c, k) => Math.min(255, Math.round(c * gain[k]))) as [number, number, number];
}

/**
 * Varens afgrænsning: pixels der afviger mere end DIFF fra baggrunden. Kanten
 * (2 %) ignoreres, og 0,5 %-percentiler fjerner enkelte fnug og støj.
 */
export function productBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: [number, number, number],
): { x: number; y: number; w: number; h: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  const mx = Math.floor(width * 0.02);
  const my = Math.floor(height * 0.02);
  const step = Math.max(1, Math.floor(Math.max(width, height) / 600));
  for (let y = my; y < height - my; y += step) {
    for (let x = mx; x < width - mx; x += step) {
      const i = (y * width + x) * 4;
      const d = Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]));
      if (d > DIFF) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (xs.length < 20) return { x: 0, y: 0, w: width, h: height };
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  const lo = Math.floor(xs.length * 0.005);
  const hi = Math.ceil(xs.length * 0.995) - 1;
  const pad = Math.round(Math.max(width, height) * 0.01);
  const x0 = Math.max(0, xs[lo] - pad);
  const y0 = Math.max(0, ys[lo] - pad);
  const x1 = Math.min(width - 1, xs[hi] + pad);
  const y1 = Math.min(height - 1, ys[hi] + pad);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Lysboksfoto → færdigt kvadratisk produktbillede (WebP). */
export async function lightboxPhoto(photo: Blob, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const src = document.createElement("canvas");
  src.width = Math.round(bitmap.width * scale);
  src.height = Math.round(bitmap.height * scale);
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(bitmap, 0, 0, src.width, src.height);
  bitmap.close();
  const img = sctx.getImageData(0, 0, src.width, src.height);
  const bg = whitenBackground(img.data, src.width, src.height);
  sctx.putImageData(img, 0, 0);
  const box = productBounds(img.data, src.width, src.height, bg);

  const out = document.createElement("canvas");
  out.width = SIZE;
  out.height = SIZE;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const s = (SIZE * FILL) / Math.max(box.w, box.h);
  const w = box.w * s;
  const h = box.h * s;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, box.x, box.y, box.w, box.h, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/webp", 0.9));
}
