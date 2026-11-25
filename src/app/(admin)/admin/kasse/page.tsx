import { Suspense } from "react";
import { KasseScreen } from "./_components/kasse-screen";
import { KasseSkeleton } from "./_components/kasse-skeleton";

export const dynamic = "force-dynamic";

/**
 * Kasse (POS): scan/søg, hurtigvalg, kurv med kunde, depositum og betaling.
 * /admin/platform/pos omdirigerer hertil. ?sag=<id> henter en reparationssag til
 * betaling; &depositum=1 åbner depositum-dialogen for sagen.
 *
 * Kortflowet afgøres pr. butik af serveren (terminalKind fra /api/pos/session):
 * "manual" = "Kortet er godkendt"; en integreret terminal = beløbet sendes til
 * butikkens terminal med mulighed for at annullere.
 */
export default function KassePage() {
  return (
    <Suspense fallback={<KasseSkeleton />}>
      <KasseScreen />
    </Suspense>
  );
}
