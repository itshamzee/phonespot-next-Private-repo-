"use client";

import { Suspense } from "react";
import { InboxScreen } from "@/components/admin/inbox/inbox-screen";

/** Kundecenter: fælles indbakke for mail, SMS, formularer og anmeldelser. */
export default function KundecenterPage() {
  // useSearchParams (?id=) kræver en Suspense-grænse.
  return (
    <Suspense fallback={null}>
      <InboxScreen />
    </Suspense>
  );
}
