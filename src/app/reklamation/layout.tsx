import type { Metadata } from "next";

// Siden selv er en client component (formular-state), så metadata bor her.
export const metadata: Metadata = {
  title: "Reklamation | PhoneSpot",
  description:
    "Opret en reklamation hos PhoneSpot. Enheder er dækket af 36 måneders garanti, tilbehør af 2 års reklamationsret — vi svarer hurtigt på alle sager.",
  alternates: { canonical: "https://phonespot.dk/reklamation" },
};

export default function ReklamationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
