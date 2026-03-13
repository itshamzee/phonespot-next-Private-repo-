import QRCode from "qrcode";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

/**
 * Generate a QR code PNG buffer for warranty verification.
 * The QR code links to the public verification page.
 */
export async function generateWarrantyQR(verificationCode: string): Promise<Buffer> {
  const url = `${SITE_URL}/garanti/${verificationCode}`;
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 200,
    margin: 1,
    color: {
      dark: "#1a1a1a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
  return buffer;
}
