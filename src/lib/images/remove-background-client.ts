/**
 * Fritlægning i browseren (@imgly/background-removal, WASM). Første gang hentes
 * en model på ~40 MB; derefter er den cachet. Bruges af billeduploaderen og af
 * leverandør-importen, så begge steder gør præcis det samme: hent billedet,
 * fjern baggrunden, upload resultatet og få den nye URL tilbage.
 */
export type BackgroundProgress = (text: string) => void;

export async function removeBackgroundAndUpload(url: string, folder: string, onProgress: BackgroundProgress = () => {}): Promise<string> {
  onProgress("Henter billede");
  const source = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("download");
    return r.blob();
  });
  const { removeBackground } = await import("@imgly/background-removal");
  const cut = await removeBackground(source, {
    progress: (key, current, total) => {
      if (key === "compute:inference") onProgress("Fjerner baggrund");
      else if (key.startsWith("fetch:")) onProgress(`Henter model ${total > 0 ? Math.round((current / total) * 100) : 0} %`);
    },
  });
  onProgress("Gemmer");
  const name = (url.split("/").pop() ?? "billede").replace(/\.\w+$/, "") + "-fritlagt.png";
  const formData = new FormData();
  formData.append("file", new File([cut], name, { type: "image/png" }));
  formData.append("folder", folder);
  const res = await fetch("/api/platform/images/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("upload");
  const data = await res.json();
  return data.url as string;
}
