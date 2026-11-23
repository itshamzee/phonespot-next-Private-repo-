"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Notice, PageHeader } from "@/components/admin/ui";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { LAST_STORE_KEY, ReceiptEditor, type StoreOption } from "../_components/receipt-editor";

type Loc = { id: string; slug: string; name: string };

/**
 * /admin/opkoeb/slutsedler/ny
 *   ?location=<id>  butikken fra kassen
 *   ?inquiry=<id>   udfyld fra en online-henvendelse
 *   ?kladde=<id>    åbn en gemt kladde igen (sættes af editoren)
 * Uden ?location bruges medarbejderens egen butik. Ejeren får butikken fra
 * butiksvælgeren i toppen eller den sidst brugte; ellers skal den vælges.
 */
function NewReceipt() {
  const params = useSearchParams();
  const wantedLocation = params.get("location");
  const inquiryId = params.get("inquiry") ?? undefined;
  // Læses kun ved første visning: editoren sætter selv ?kladde=, når kladden er oprettet.
  const [draftId] = useState(() => params.get("kladde") ?? undefined);
  const { ownSlug, scope, loading: scopeLoading } = useStoreScope();
  const [locations, setLocations] = useState<Loc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await staffFetch("/api/pos/locations");
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { locations: Loc[] };
        if (!cancelled) setLocations(data.locations);
      } catch {
        if (!cancelled) setError("Butikkerne kunne ikke hentes. Genindlæs siden.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const header = (
    <PageHeader
      title="Nyt opkøb"
      description="Scan enheden, vælg model og stand, udfyld sælger og tjek, og bekræft. Slutsedlen åbner til print."
      backHref="/admin/opkoeb"
      backLabel="Opkøb"
    />
  );

  if (error) {
    return (
      <>
        {header}
        <Notice tone="danger">{error}</Notice>
      </>
    );
  }
  if (!locations || scopeLoading) {
    return (
      <>
        {header}
        <p className="text-[14px] text-gray">Henter …</p>
      </>
    );
  }
  if (locations.length === 0) {
    return (
      <>
        {header}
        <Notice tone="warning" title="Ingen butik">
          Du er ikke knyttet til en butik, så du kan ikke oprette opkøb. Bed ejeren om at tildele dig en butik.
        </Notice>
      </>
    );
  }

  let remembered: string | null = null;
  try {
    remembered = window.localStorage.getItem(LAST_STORE_KEY);
  } catch {
    // Uden lager huskes butikken ikke.
  }
  // Aldrig en tilfældig butik: kan den ikke afgøres, vælger man selv, før kladden oprettes.
  const chosen =
    locations.find((l) => l.id === wantedLocation) ??
    locations.find((l) => l.slug === ownSlug) ??
    locations.find((l) => l.slug === scope) ??
    locations.find((l) => l.id === remembered) ??
    (locations.length === 1 ? locations[0] : undefined);
  // Kun navne vises her, aldrig adresser.
  const stores: StoreOption[] = locations.map((l) => ({ id: l.id, name: l.name }));

  return (
    <>
      {header}
      <ReceiptEditor locationId={chosen?.id ?? ""} inquiryId={inquiryId} draftId={draftId} stores={stores} />
    </>
  );
}

export default function NewReceiptPage() {
  return (
    <Suspense fallback={null}>
      <NewReceipt />
    </Suspense>
  );
}
