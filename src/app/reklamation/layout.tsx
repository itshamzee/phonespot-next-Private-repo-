import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reklamation - PhoneSpot",
  description:
    "Indsend en reklamation til PhoneSpot. Vi behandler alle reklamationer inden for 2 hverdage og sikrer en hurtig løsning.",
};

export default function ReklamationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
