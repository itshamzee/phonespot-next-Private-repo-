/**
 * Klient-side: en uploadet indleveringsfoto gemmes i formularen som STI i den
 * private bucket (det er den der sendes til serveren). Til forhåndsvisning
 * husker vi den signerede URL, som upload-svaret gav, indtil siden lukkes.
 */
const previews = new Map<string, string>();

export function rememberPreview(path: string, signedUrl: string) {
  previews.set(path, signedUrl);
}

/** Signeret URL hvis vi har en, ellers værdien som den er (fx en ældre offentlig URL). */
export function previewSrc(value: string): string {
  return previews.get(value) ?? value;
}
