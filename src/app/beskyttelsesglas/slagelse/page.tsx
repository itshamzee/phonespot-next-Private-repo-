import type { Metadata } from "next";
import { STORES } from "@/lib/store-config";
import { LocalCityPage } from "../_components/LocalCityPage";

export const metadata: Metadata = {
  title: "Beskyttelsesglas i Slagelse · gratis montering · PhoneSpot",
  description: "Beskyttelsesglas til iPhone, Samsung og alle telefoner — gratis professionel montering i Slagelse på 60 sekunder.",
  alternates: { canonical: "/beskyttelsesglas/slagelse" },
};

export default function SlagelsePage() {
  return <LocalCityPage store={STORES.slagelse} heroImage="/spot/hero.png" />;
}
