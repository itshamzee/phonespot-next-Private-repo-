import type { Metadata } from "next";
import { STORES } from "@/lib/store-config";
import { LocalCityPage } from "../_components/LocalCityPage";

export const metadata: Metadata = {
  title: "Beskyttelsesglas i Slagelse · gratis montering · PhoneSpot",
  description: "Beskyttelsesglas i Slagelse. Få hjælp til valg og gratis montering ved køb hos PhoneSpot. Se adresse og åbningstider.",
  alternates: { canonical: "/beskyttelsesglas/slagelse" },
};

export default function SlagelsePage() {
  return <LocalCityPage store={STORES.slagelse} heroImage="/spot/hero.png" />;
}
