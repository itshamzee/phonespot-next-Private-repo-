import { SellCityPage, sellCityMetadata } from "@/components/sell-device/sell-city-page";

export const metadata = sellCityMetadata("horsens");

export default function SellInHorsensPage() {
  return <SellCityPage slug="horsens" />;
}
