import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bliv forhandler hos PhoneSpot | Ansøg om erhvervskonto",
  description: "Ansøg om en erhvervskonto hos PhoneSpot. Få adgang til engrospriser på reservedele til jeres værksted eller forretning.",
  alternates: { canonical: "https://phonespot.dk/b2b/registrer" },
  robots: { index: false, follow: true },
};

export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
