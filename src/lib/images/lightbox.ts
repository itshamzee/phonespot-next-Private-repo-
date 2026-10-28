/**
 * Hurtig fritlægning af fotos taget i lysboks (ensfarvet lys baggrund) — ren
 * pixelbehandling uden AI-model, så det tager under et sekund selv på en gammel
 * telefon. Baggrundsfarven måles i billedets kant; kun pixels, der ligner den OG
 * hænger sammen med kanten, gøres gennemsigtige (flood fill). Derfor forsvinder
 * et hvidt cover ikke, så længe det har en kant eller skygge rundt om sig.
 */

const INNER = 6; // afstand til baggrunden, der altid er baggrund
const OUTER = 16; // over denne afstand er det vare; imellem bliver kanten blød

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 255;
}

/** Sætter alfa i RGBA-data på stedet. Returnerer den målte baggrundsfarve. */
export function lightboxAlpha(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    r.push(data[i]);
    g.push(data[i + 1]);
    b.push(data[i + 2]);
  };
  const stepX = Math.max(1, Math.floor(width / 64));
  const stepY = Math.max(1, Math.floor(height / 64));
  for (let x = 0; x < width; x += stepX) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    sample(0, y);
    sample(width - 1, y);
  }
  const bg: [number, number, number] = [median(r), median(g), median(b)];

  const n = width * height;
  const dist = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const d = Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]));
    dist[p] = d > 255 ? 255 : d;
  }

  // Flood fill fra kanten gennem baggrundslignende pixels.
  const visited = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  const push = (p: number) => {
    if (!visited[p] && dist[p] < OUTER) {
      visited[p] = 1;
      stack[top++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (top > 0) {
    const p = stack[--top];
    const x = p % width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (p >= width) push(p - width);
    if (p < n - width) push(p + width);
  }

  for (let p = 0; p < n; p++) {
    if (!visited[p]) continue;
    const d = dist[p];
    data[p * 4 + 3] = d <= INNER ? 0 : Math.round(((d - INNER) / (OUTER - INNER)) * 255);
  }
  return bg;
}

/** Lysboksfoto → PNG med gennemsigtig baggrund (input til composeStudioPhoto). */
export async function cutoutFromLightbox(photo: Blob, max = 1400): Promise<Blob> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  lightboxAlpha(img.data, canvas.width, canvas.height);
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"));
}
