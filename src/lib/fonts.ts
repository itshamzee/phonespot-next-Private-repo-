import { Plus_Jakarta_Sans } from "next/font/google";

export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Use the same font for body — Plus Jakarta Sans is versatile enough
export const plusJakartaBody = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

// Backwards compatibility exports
export const barlowCondensed = plusJakarta;
export const dmSans = plusJakartaBody;
