import { SellCityPage, sellCityMetadata } from "@/components/sell-device/sell-city-page";

export const metadata = sellCityMetadata("fredericia");

export default function SellInFredericiaPage() {
  return <SellCityPage slug="fredericia" />;
}
