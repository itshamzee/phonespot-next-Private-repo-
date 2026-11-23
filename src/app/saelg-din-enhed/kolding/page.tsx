import { SellCityPage, sellCityMetadata } from "@/components/sell-device/sell-city-page";

export const metadata = sellCityMetadata("kolding");

export default function SellInKoldingPage() {
  return <SellCityPage slug="kolding" />;
}
