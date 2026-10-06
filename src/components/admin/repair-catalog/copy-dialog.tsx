"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/varer/modal";
import type { ManageBrandNode, ManageModelNode } from "@/lib/repairs/catalog-manage-types";
import { BASE, api } from "./api";
import { ErrorNote, btnPrimary, btnSecondary, inputCls } from "./ui";

/**
 * Kopiér reparationer fra en søskendemodel. Kopierne oprettes inaktive (med kildens priser som udgangspunkt),
 * så delene kan lagerføres, og ejeren selv sætter priser og aktiverer.
 */
export function CopyDialog({
  open,
  target,
  brand,
  onClose,
  onDone,
}: {
  open: boolean;
  target: { id: string; name: string };
  brand: ManageBrandNode | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (brand?.series ?? [])
      .map((s) => ({
        name: s.name,
        models: s.models.filter((m) => m.id !== target.id && m.total_services > 0 && (!needle || m.name.toLowerCase().includes(needle))),
      }))
      .filter((s) => s.models.length > 0);
  }, [brand, q, target.id]);

  const picked: ManageModelNode | undefined = groups.flatMap((g) => g.models).find((m) => m.id === from);

  async function copy() {
    if (!from) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ created: string[]; skipped: number }>(`${BASE}/models/${target.id}/copy-services`, { body: { from_model_id: from } });
      const n = res.created.length;
      onDone(
        n === 0
          ? `Ingen nye reparationer: ${target.name} har dem allerede.`
          : `${n} reparationer kopieret som inaktive. Priserne er kopieret fra ${picked?.name ?? "kilden"}: ret dem, og aktivér derefter.`,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Kopiér reparationer til ${target.name}`}
      width={520}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Annullér
          </button>
          <button type="button" className={btnPrimary} onClick={copy} disabled={busy || !from}>
            {busy ? "Kopierer..." : "Kopiér reparationer"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-[14px]">
        <p className="text-[#3D4842]">
          Vælg en model, der har de samme reparationer. De kopieres som <strong>inaktive</strong>: intet vises på hjemmesiden, før du har tjekket priserne og
          aktiveret dem.
        </p>
        <input className={inputCls} placeholder="Søg model" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Søg model" />
        <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#E2E5E0]">
          {groups.length === 0 && <p className="px-3 py-6 text-center text-[#5E6A63]">Ingen modeller med reparationer under mærket.</p>}
          {groups.map((g) => (
            <div key={g.name}>
              <p className="sticky top-0 bg-[#F5F6F4] px-3 py-1.5 text-[12px] font-semibold text-[#5E6A63]">{g.name}</p>
              {g.models.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 border-t border-[#EEF0EC] px-3 py-2.5 hover:bg-[#F5F6F4]">
                  <input type="radio" name="copy-from" checked={from === m.id} onChange={() => setFrom(m.id)} className="accent-[#1A3D2E]" />
                  <span className="flex-1">{m.name}</span>
                  <span className="text-[13px] text-[#5E6A63]">{m.total_services} reparationer</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    </Modal>
  );
}
