"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice, PageHeader } from "@/components/admin/ui";
import { AccessoryForm, type EditableProduct } from "@/components/admin/products/create/accessory-form";

/**
 * Redigér et tilbehørsprodukt. Samme formular som "Opret produkt", så der ikke
 * er forskel på hvad man kan ved oprettelse og bagefter. Reservedele har
 * stadig deres egen side og sendes videre dertil.
 */
export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<EditableProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"duplicate" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/products/${id}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) return setError(body?.error ?? "Produktet kunne ikke åbnes.");
        if (body.product?.category === "spare-part") return router.replace(`/admin/reservedele/${id}`);
        setData(body);
      })
      .catch(() => !cancelled && setError("Ingen forbindelse. Tjek netværket og prøv igen."));
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function duplicate() {
    setBusy("duplicate");
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body?.error ?? "Kopien blev ikke oprettet.");
      router.push(`/admin/produkter/${body.id}`);
    } catch {
      setError("Ingen forbindelse. Kopien blev ikke oprettet.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirmDelete(false);
        return setError(body?.error ?? "Produktet blev ikke slettet.");
      }
      router.push("/admin/tilbehoer");
    } catch {
      setError("Ingen forbindelse. Produktet blev ikke slettet.");
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1040px]">
        {error ? <Notice tone="danger" title="Kunne ikke åbne produktet">{error}</Notice> : <p className="text-[14px] text-gray">Henter produktet</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1040px]">
      <PageHeader
        title={String(data.product.title ?? "Produkt")}
        backHref="/admin/tilbehoer"
        backLabel="Tilbehør"
        actions={
          confirmDelete ? (
            <>
              <span className="text-[13px] text-gray">Slet produktet helt?</span>
              <Button size="sm" onClick={() => setConfirmDelete(false)}>Fortryd</Button>
              <Button size="sm" variant="danger" loading={busy === "delete"} onClick={remove}>Ja, slet</Button>
            </>
          ) : (
            <>
              <Button size="sm" loading={busy === "duplicate"} onClick={duplicate}>Dupliker</Button>
              <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(true)}>Slet</Button>
            </>
          )
        }
      />
      {error && <div className="mb-6"><Notice tone="danger">{error}</Notice></div>}
      <AccessoryForm key={data.product.id} edit={data} />
    </div>
  );
}
