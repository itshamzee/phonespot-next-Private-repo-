/**
 * Gør et fritlagt mobilfoto til et ensartet produktbillede: beskåret til
 * varen, centreret på en kvadratisk lys baggrund (samme tone som produktkortene)
 * med en blød skygge under. Alle covers fra hurtig-oprettelsen ser derfor ens ud
 * i griddet, uanset hvor praktikanten tog billedet.
 */

const SIZE = 1200;
const FILL = 0.8; // varen fylder højst 80 % af den længste side
const BACKGROUND = "#f5f5f2";

async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

/** Afgrænsning af de ikke-gennemsigtige pixels. */
function opaqueBounds(bitmap: ImageBitmap): { x: number; y: number; w: number; h: number } {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: width, h: height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export async function composeStudioPhoto(cutout: Blob): Promise<Blob> {
  const bitmap = await loadBitmap(cutout);
  const box = opaqueBounds(bitmap);
  const scale = (SIZE * FILL) / Math.max(box.w, box.h);
  const w = box.w * scale;
  const h = box.h * scale;
  const x = (SIZE - w) / 2;
  const y = (SIZE - h) / 2 - SIZE * 0.02;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Blød kontaktskygge under varen
  const shadowY = y + h + SIZE * 0.015;
  const gradient = ctx.createRadialGradient(SIZE / 2, shadowY, 0, SIZE / 2, shadowY, w * 0.55);
  gradient.addColorStop(0, "rgba(0,0,0,0.16)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(0, shadowY);
  ctx.scale(1, 0.12);
  ctx.translate(0, -shadowY);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, shadowY - w, SIZE, w * 2);
  ctx.restore();

  // Varen med en svag omgivende skygge
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = SIZE * 0.025;
  ctx.shadowOffsetY = SIZE * 0.008;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, box.x, box.y, box.w, box.h, x, y, w, h);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas"))), "image/webp", 0.9),
  );
}
