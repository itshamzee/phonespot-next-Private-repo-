import sharp from "sharp";

/**
 * Produktbilleder gemmes som WebP på højst MAX_EDGE px. next/image kører med
 * `unoptimized`, så det der ligger i storage er præcis det kunden (og
 * admin-listerne) henter — en 1 MB PNG fra en leverandør bliver typisk
 * 60–120 KB uden synligt tab. Gennemsigtighed bevares.
 */
export const MAX_EDGE = 1600;

/** Et år; filnavne er unikke, så et billede ændrer sig aldrig under samme URL. */
export const IMAGE_CACHE_SECONDS = "31536000";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export interface OptimizedImage {
  data: Buffer;
  contentType: string;
  ext: string;
}

export async function optimizeProductImage(input: Buffer, contentType: string): Promise<OptimizedImage> {
  try {
    const data = await sharp(input, { failOn: "error" })
      .rotate() // respekter EXIF-rotation fra telefonbilleder
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90, effort: 4 })
      .toBuffer();
    return { data, contentType: "image/webp", ext: "webp" };
  } catch {
    // Hellere det originale billede end en fejlet upload
    return { data: input, contentType, ext: EXT[contentType] ?? "jpg" };
  }
}
