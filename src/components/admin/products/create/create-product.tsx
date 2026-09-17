"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, Segmented } from "@/components/admin/ui";
import { AccessoryForm } from "./accessory-form";
import { SparePartForm } from "./spare-part-form";
import { BulkPaste } from "./bulk-paste";

type Kind = "accessory" | "spare-part" | "bulk" | "device";

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "accessory", label: "Tilbehør", hint: "Covers, glas, kabler, opladere, lyd" },
  { value: "spare-part", label: "Reservedel", hint: "Skærme, batterier og dele til reparation" },
  { value: "bulk", label: "Flere fra regneark", hint: "Indsæt mange rækker på én gang" },
  { value: "device", label: "Enhed", hint: "Telefon, tablet, computer eller ur til salg" },
];

export function CreateProduct() {
  const params = useSearchParams();
  const initial = (params.get("type") as Kind | null) ?? "accessory";
  const [kind, setKind] = useState<Kind>(KINDS.some((k) => k.value === initial) ? initial : "accessory");

  return (
    <div className="mx-auto max-w-[1040px]">
      <PageHeader
        title="Opret produkt"
        description="Ét sted for alt, der skal på webshoppen. Udfyld det nødvendige, se hvordan produktet kommer til at se ud, og opret. Resten kan rettes senere."
      />
      <div className="mb-8">
        <Segmented label="Produkttype" value={kind} onChange={setKind} options={KINDS} />
      </div>
      {kind === "accessory" && <AccessoryForm />}
      {kind === "spare-part" && <SparePartForm />}
      {kind === "bulk" && <BulkPaste />}
      {kind === "device" && (
        <div className="max-w-[640px] rounded-xl border border-sand bg-white p-6 text-[14px] text-charcoal">
          <p className="font-medium">Enheder registreres stadig via “Registrér enhed”.</p>
          <p className="mt-1 text-gray">
            Der vælger du model, stand, lagerplads og pris, og enheden kommer på webshoppen med det samme. Det flow flytter hertil i næste trin.
          </p>
          <Link href="/admin/platform/intake" className="mt-4 inline-flex h-10 items-center rounded-lg bg-green-eco px-4 font-medium text-white hover:bg-green-light">
            Gå til Registrér enhed
          </Link>
        </div>
      )}
    </div>
  );
}
