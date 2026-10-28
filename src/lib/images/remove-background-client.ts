/**
 * Fritlægning i browseren (@imgly/background-removal, WASM/WebGPU). Bruges af
 * billeduploaderen og af leverandør-importen, så begge steder gør det samme:
 * hent billedet, fjern baggrunden, upload resultatet og få den nye URL tilbage.
 *
 * Tre ting holder det hurtigt:
 *  - den kvantiserede model (isnet_quint8) er ca. en fjerdedel af standardens
 *    filstørrelse og rammer lige så rent på produktfotos med rolig baggrund
 *  - WebGPU når browseren har det (typisk 3-5 gange hurtigere end WASM/CPU),
 *    med fald tilbage til CPU hvis noget fejler
 *  - resultatet gemmes som WebP, ikke PNG: ~50 KB i stedet for ~1 MB at uploade
 *
 * Modellen hentes én gang pr. browser og ligger i cachen bagefter. Kald
 * preloadBackgroundRemoval(), når det er tydeligt at brugeren skal bruge den,
 * så hentningen overlapper med det, de ellers venter på.
 */
type Imgly = typeof import("@imgly/background-removal");
type Config = NonNullable<Parameters<Imgly["removeBackground"]>[1]>;

export type BackgroundProgress = (text: string) => void;

let libPromise: Promise<Imgly> | null = null;
let configPromise: Promise<Config> | null = null;
let warmPromise: Promise<void> | null = null;
/** Sættes hvis GPU-forsøget fejler, så resten af kørslen går direkte på CPU. */
let gpuBroken = false;

function lib(): Promise<Imgly> {
  libPromise ??= import("@imgly/background-removal");
  return libPromise;
}

async function hasWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

async function config(): Promise<Config> {
  configPromise ??= (async () => {
    const gpu = await hasWebGpu();
    return {
      device: gpu ? ("gpu" as const) : ("cpu" as const),
      model: "isnet_quint8" as const,
      output: { format: "image/webp" as const, quality: 0.9 },
    };
  })();
  const base = await configPromise;
  return gpuBroken ? { ...base, device: "cpu" as const } : base;
}

/** Henter model og runtime i baggrunden. Sikker at kalde flere gange. */
export function preloadBackgroundRemoval(): Promise<void> {
  warmPromise ??= (async () => {
    const [{ preload }, cfg] = await Promise.all([lib(), config()]);
    await preload(cfg);
  })().catch(() => {
    // Forhåndshentning er en optimering; fejler den, henter selve kørslen modellen
    warmPromise = null;
  });
  return warmPromise;
}

/** Fjerner baggrunden fra et billede, der allerede er i browseren (fx et kamerafoto). */
export async function removeBackgroundFromBlob(source: Blob, onProgress: BackgroundProgress = () => {}): Promise<Blob> {
  const { removeBackground } = await lib();
  const run = async () => {
    const cfg = await config();
    return removeBackground(source, {
      ...cfg,
      progress: (key, current, total) => {
        if (key === "compute:inference") onProgress("Fjerner baggrund");
        else if (key.startsWith("fetch:")) onProgress(`Henter model ${total > 0 ? Math.round((current / total) * 100) : 0} %`);
      },
    });
  };

  try {
    return await run();
  } catch (err) {
    // Grafikkortet kan svigte midt i (drivere, lav hukommelse) — tag CPU-vejen én gang
    if (gpuBroken || (await config()).device !== "gpu") throw err;
    gpuBroken = true;
    onProgress("Fjerner baggrund");
    return run();
  }
}

/** Uploader et billede til den offentlige katalog-bucket og returnerer URL'en. */
export async function uploadImageBlob(blob: Blob, name: string, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", new File([blob], name, { type: blob.type || "image/webp" }));
  formData.append("folder", folder);
  const res = await fetch("/api/platform/images/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("upload");
  const data = await res.json();
  return data.url as string;
}

export async function removeBackgroundAndUpload(url: string, folder: string, onProgress: BackgroundProgress = () => {}): Promise<string> {
  onProgress("Henter billede");
  const source = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("download");
    return r.blob();
  });

  const cut = await removeBackgroundFromBlob(source, onProgress);

  onProgress("Gemmer");
  const ext = cut.type === "image/png" ? "png" : "webp";
  const name = (url.split("/").pop() ?? "billede").replace(/\.\w+$/, "") + `-fritlagt.${ext}`;
  return uploadImageBlob(cut, name, folder);
}
