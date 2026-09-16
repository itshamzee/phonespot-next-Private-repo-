import { Barlow_Condensed, DM_Sans } from "next/font/google";

export const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Retain compatibility for existing imports while using the approved fonts.
export const plusJakarta = barlowCondensed;
export const plusJakartaBody = dmSans;
