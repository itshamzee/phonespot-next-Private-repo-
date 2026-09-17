"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, Segmented } from "@/components/admin/ui";
import { AccessoryForm } from "./accessory-form";
import { SparePartForm } from "./spare-part-form";
import { BulkPaste } from "./bulk-paste";
import { DeviceForm } from "./device-form";

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
        actions={
          <Link href="/admin/produkter/importer" className="inline-flex h-10 items-center rounded-lg border border-sand bg-white px-4 text-[14px] font-medium text-charcoal hover:bg-cream">
            Importér mange fra leverandør
          </Link>
        }
      />
      <div className="mb-8">
        <Segmented label="Produkttype" value={kind} onChange={setKind} options={KINDS} />
      </div>
      {kind === "accessory" && <AccessoryForm />}
      {kind === "spare-part" && <SparePartForm />}
      {kind === "bulk" && <BulkPaste />}
      {kind === "device" && <DeviceForm />}
    </div>
  );
}
