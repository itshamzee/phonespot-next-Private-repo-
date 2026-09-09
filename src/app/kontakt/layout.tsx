import type { Metadata } from "next";

// Siden selv er en client component (formular-state), så metadata bor her.
export const metadata: Metadata = {
  title: "Kontakt os | PhoneSpot",
  description:
    "Kontakt PhoneSpot i Vejle eller Slagelse. Spørgsmål om refurbished enheder, reparation eller din ordre? Skriv, ring eller kig forbi butikken.",
  alternates: { canonical: "https://phonespot.dk/kontakt" },
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return children;
}
