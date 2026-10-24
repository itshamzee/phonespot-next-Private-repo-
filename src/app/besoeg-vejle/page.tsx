import type { Metadata } from "next";
import { BesoegPage } from "@/components/besoeg/besoeg-page";

export const metadata: Metadata = {
  title: "PhoneSpot Vejle | Brugte iPhones, iPads og bærbare",
  description:
    "Besøg PhoneSpot Vejle. Brugte iPhones, iPads og bærbare med 36 måneders garanti. Se dem, prøv dem og tag dem med hjem.",
  alternates: { canonical: "https://phonespot.dk/besoeg-vejle" },
  robots: { index: false, follow: true },
};

export default function BesoegVejlePage() {
  return <BesoegPage slug="vejle" />;
}
