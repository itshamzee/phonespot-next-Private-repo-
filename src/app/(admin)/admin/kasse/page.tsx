import { Suspense } from "react";
import { KasseScreen } from "./_components/kasse-screen";

/**
 * Kasse (POS): scan/søg, hurtigvalg, kurv med kunde, depositum og betaling.
 * /admin/platform/pos omdirigerer hertil. ?sag=<id> henter en reparationssag til
 * betaling; &depositum=1 åbner depositum-dialogen for sagen.
 */
export default function KassePage() {
  return (
    <Suspense fallback={null}>
      <KasseScreen />
    </Suspense>
  );
}
