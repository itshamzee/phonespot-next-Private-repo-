import { Suspense } from "react";
import { paymentTerminalKind } from "@/lib/pos/payment-terminal";
import { KasseScreen } from "./_components/kasse-screen";

export const dynamic = "force-dynamic";

/**
 * Kasse (POS): scan/søg, hurtigvalg, kurv med kunde, depositum og betaling.
 * /admin/platform/pos omdirigerer hertil. ?sag=<id> henter en reparationssag til
 * betaling; &depositum=1 åbner depositum-dialogen for sagen.
 *
 * terminalKind (server side, POS_TERMINAL_PROVIDER) styrer kortflowet: "manual"
 * = "Kortet er godkendt" som i dag; en integreret terminal = beløbet sendes til
 * terminalen med mulighed for at annullere.
 */
export default function KassePage() {
  return (
    <Suspense fallback={null}>
      <KasseScreen terminalKind={paymentTerminalKind()} />
    </Suspense>
  );
}
