import type { Metadata } from "next";
import { STORES } from "@/lib/store-config";
import { LocalCityPage } from "../_components/LocalCityPage";

export const metadata: Metadata = {
  title: "Beskyttelsesglas i Vejle · gratis montering · PhoneSpot",
  description: "Beskyttelsesglas i Vejle. Få hjælp til valg og gratis montering ved køb hos PhoneSpot. Se adresse og åbningstider.",
  alternates: { canonical: "/beskyttelsesglas/vejle" },
};

export default function VejlePage() {
  return <LocalCityPage store={STORES.vejle} heroImage="/spot/hero.png" />;
}
