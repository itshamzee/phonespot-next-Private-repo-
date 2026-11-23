import { SellCityPage, sellCityMetadata } from "@/components/sell-device/sell-city-page";

export const metadata = sellCityMetadata("slagelse");

export default function SellInSlagelsePage() {
  return <SellCityPage slug="slagelse" />;
}
