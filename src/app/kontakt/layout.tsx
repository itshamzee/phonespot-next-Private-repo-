import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt os - PhoneSpot",
  description:
    "Har du spørgsmål? Kontakt PhoneSpot via vores kontaktformular eller på info@phonespot.dk. Vi svarer inden for 24 timer.",
};

export default function KontaktLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
