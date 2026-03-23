"use client";

import { TilbehoerLayout } from "./tilbehoer-layout";
import { TrustBar } from "@/components/ui/trust-bar";

export function HubPageClient() {
  return (
    <>
      <TilbehoerLayout
        heroTitle="Tilbehør"
        heroDescription="Covers, opladere, kabler og mere — til alle populære mærker"
        activeCategory=""
      />
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <TrustBar />
      </div>
    </>
  );
}
