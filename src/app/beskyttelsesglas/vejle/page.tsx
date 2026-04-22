import type { Metadata } from "next";
import { STORES } from "@/lib/store-config";
import { LocalCityPage } from "../_components/LocalCityPage";

export const metadata: Metadata = {
  title: "Beskyttelsesglas i Vejle · gratis montering · PhoneSpot",
  description: "Beskyttelsesglas til iPhone, Samsung og alle telefoner — gratis professionel montering i Vejle på 60 sekunder.",
  alternates: { canonical: "/beskyttelsesglas/vejle" },
};

export default function VejlePage() {
  return <LocalCityPage store={STORES.vejle} heroImage="/spot/hero.png" />;
}
