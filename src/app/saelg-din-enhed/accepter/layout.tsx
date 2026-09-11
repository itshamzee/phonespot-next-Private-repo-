import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "@/components/sell-device/sell-device.module.css";

export const metadata: Metadata = {
  title: "Acceptér tilbud | PhoneSpot",
  alternates: { canonical: "https://phonespot.dk/saelg-din-enhed/accepter" },
  robots: { index: false, follow: false },
};

export default function OfferLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.offerSurface}>
      <div className={styles.offerLabel}>
        <StorefrontIcon kind="exchange" />
        Sælg din enhed · Dit tilbud
      </div>
      {children}
    </div>
  );
}
