"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Notice, PageHeader } from "@/components/admin/ui";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { ReceiptEditor, type StoreOption } from "../_components/receipt-editor";

type Loc = { id: string; slug: string; name: string };

/**
 * /admin/opkoeb/slutsedler/ny
 *   ?location=<id>  butikken fra kassen
 *   ?inquiry=<id>   udfyld fra en online-henvendelse
 *   ?kladde=<id>    åbn en gemt kladde igen (sættes af editoren)
 * Uden ?location bruges medarbejderens egen butik; ejeren vælger.
 */
function NewReceipt() {
  const params = useSearchParams();
  const wantedLocation = params.get("location");
  const inquiryId = params.get("inquiry") ?? undefined;
  // Læses kun ved første visning: editoren sætter selv ?kladde=, når kladden er oprettet.
  const [draftId] = useState(() => params.get("kladde") ?? undefined);
  const { isOwner, ownSlug, loading: scopeLoading } = useStoreScope();
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

  const chosen =
    locations.find((l) => l.id === wantedLocation) ??
    locations.find((l) => l.slug === ownSlug) ??
    locations[0];
  // Kun navne vises her, aldrig adresser.
  const stores: StoreOption[] = isOwner || locations.length > 1 ? locations.map((l) => ({ id: l.id, name: l.name })) : [{ id: chosen.id, name: chosen.name }];

  return (
    <>
      {header}
      <ReceiptEditor locationId={chosen.id} inquiryId={inquiryId} draftId={draftId} stores={stores} />
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
