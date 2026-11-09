/**
 * Gør et foto lille nok til upload-ruten (Vercel afviser forespørgsler over
 * ca. 4,5 MB). Billeder tegnes på et lærred (højst 2000 px på den lange side)
 * og gemmes som JPEG; kvaliteten sænkes trinvis, hvis resultatet stadig er for
 * stort. PDF'er sendes uændret. Beslutningslogikken er adskilt fra browserens
 * lærred, så den kan testes.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_SIDE = 2000;
/** Første forsøg er 0,8; derefter faldende ned til 0,5. */
export const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5] as const;

export const TOO_LARGE_MESSAGE = "Filen er for stor (maks. 4 MB). Tag billedet igen eller gem PDF'en mindre.";

export type DecodedImage = { width: number; height: number; source: CanvasImageSource; close?: () => void };

export type CompressEnv = {
  /** null, når browseren ikke kan afkode filen (fx HEIC i Chrome). */
  decode: (file: File) => Promise<DecodedImage | null>;
  /** Tegner billedet i den givne størrelse og eksporterer JPEG. */
  render: (source: CanvasImageSource, width: number, height: number, quality: number) => Promise<Blob | null>;
};

export type PrepareResult = { file: File } | { error: string };

export function scaleToFit(width: number, height: number, maxSide = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const ratio = maxSide / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

const isImage = (file: File) => /^image\//.test(file.type) || /\.(jpe?g|png|heic|heif)$/i.test(file.name);

export const browserEnv: CompressEnv = {
  async decode(file) {
    try {
      if (typeof createImageBitmap === "function") {
        const bmp = await createImageBitmap(file);
        return { width: bmp.width, height: bmp.height, source: bmp, close: () => bmp.close() };
      }
      return await new Promise<DecodedImage | null>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight, source: img, close: () => URL.revokeObjectURL(url) });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch {
      return null;
    }
  },
  async render(source, width, height, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, width, height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  },
};

export async function prepareUpload(file: File, env: CompressEnv = browserEnv): Promise<PrepareResult> {
  const asIs = (): PrepareResult => (file.size <= MAX_UPLOAD_BYTES ? { file } : { error: TOO_LARGE_MESSAGE });

  if (!isImage(file)) return asIs();

  const decoded = await env.decode(file);
  if (!decoded) return asIs();

  try {
    const { width, height } = scaleToFit(decoded.width, decoded.height);
    for (const quality of QUALITY_STEPS) {
      const blob = await env.render(decoded.source, width, height, quality);
      if (!blob) return asIs();
      if (blob.size <= MAX_UPLOAD_BYTES) {
        const name = file.name.replace(/\.[^.]*$/, "") || "foto";
        return { file: new File([blob], `${name}.jpg`, { type: "image/jpeg" }) };
      }
    }
    return { error: TOO_LARGE_MESSAGE };
  } finally {
    decoded.close?.();
  }
}
