"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, Notice, PageHeader, Select, Tag, type Column } from "@/components/admin/ui";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  location_slug: string | null;
};

type StoreOption = { slug: string; label: string; available: boolean };

const ROLE_LABELS: Record<string, string> = {
  owner: "Ejer",
  manager: "Butikschef",
  employee: "Medarbejder",
};

/**
 * Ejeren knytter hver medarbejder til præcis én butik. Medarbejdere ser kun
 * deres egen butiks data; ejeren er den eneste der ser alt.
 */
export default function MedarbejderePage() {
  const { isOwner, loading: scopeLoading } = useStoreScope();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Kunne ikke hente medarbejdere. Prøv at genindlæse siden.");
      } else {
        setRows(json.staff ?? []);
        setStores(json.stores ?? []);
      }
    } catch {
      setError("Kunne ikke hente medarbejdere, fordi forbindelsen fejlede. Tjek nettet og prøv igen.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (scopeLoading || !isOwner) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [scopeLoading, isOwner, load]);

  async function assign(row: StaffRow, slug: string) {
    setSavingId(row.id);
    setError(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, location_slug: slug || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `Butikken for ${row.name} blev ikke gemt. Prøv igen.`);
      } else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, location_slug: slug || null } : r)));
        setSavedId(row.id);
      }
    } catch {
      setError(`Butikken for ${row.name} blev ikke gemt, fordi forbindelsen fejlede.`);
    }
    setSavingId(null);
  }

  if (scopeLoading) return null;

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-[760px]">
        <PageHeader title="Medarbejdere" />
        <Notice tone="warning" title="Kun ejeren kan se denne side">
          Bed ejeren om at ændre hvilken butik en medarbejder hører til.
        </Notice>
      </div>
    );
  }

  const columns: Column<StaffRow>[] = [
    {
      key: "name",
      header: "Navn",
      render: (r) => (
        <div>
          <p className="font-medium text-charcoal">{r.name}</p>
          {!r.is_active && <Tag tone="neutral">Inaktiv</Tag>}
        </div>
      ),
    },
    { key: "email", header: "E-mail", hideBelow: "md", render: (r) => <span className="text-gray">{r.email}</span> },
    { key: "role", header: "Rolle", hideBelow: "sm", render: (r) => ROLE_LABELS[r.role] ?? r.role },
    {
      key: "store",
      header: "Butik",
      className: "w-[220px]",
      render: (r) =>
        r.role === "owner" ? (
          <span className="text-[13px] text-gray">Alle butikker</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Select
                aria-label={`Butik for ${r.name}`}
                value={r.location_slug ?? ""}
                disabled={savingId === r.id}
                invalid={!r.location_slug && r.is_active}
                onChange={(e) => void assign(r, e.target.value)}
                className="!h-9 !text-[14px]"
              >
                <option value="">Ingen butik</option>
                {stores.map((s) => (
                  <option key={s.slug} value={s.slug} disabled={!s.available}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            {savedId === r.id && <span className="text-[12px] text-green-eco">Gemt</span>}
          </div>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title="Medarbejdere"
        description="Hver medarbejder hører til én butik og ser kun den butiks reparationer, henvendelser, opkøb og ordrer. Du som ejer ser alle butikker og kan skifte i topbjælken."
      />
      {error && (
        <div className="mb-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      {!loading && rows.some((r) => r.is_active && r.role !== "owner" && !r.location_slug) && (
        <div className="mb-4">
          <Notice tone="warning" title="Nogen mangler en butik">
            Medarbejdere uden butik kan logge ind, men ser ingen sager, før de har fået tildelt en butik.
          </Notice>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        empty={{ title: "Ingen medarbejdere endnu", description: "Medarbejdere oprettes som brugere i Supabase og dukker op her." }}
      />
    </div>
  );
}
