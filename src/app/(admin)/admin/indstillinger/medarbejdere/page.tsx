"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, DataTable, Field, FieldRow, Input, Notice, PageHeader, Select, Tag, type Column } from "@/components/admin/ui";
import { MIN_PASSWORD_LENGTH, generatePassword } from "@/lib/auth/staff-admin";
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
  const [showNew, setShowNew] = useState(false);
  /** Vises én gang efter oprettelse eller ny kode, så ejeren kan give den videre. */
  const [handover, setHandover] = useState<{ name: string; email: string; password: string } | null>(null);

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

  async function patch(row: StaffRow, changes: Record<string, unknown>, local: Partial<StaffRow>): Promise<boolean> {
    setSavingId(row.id);
    setError(null);
    setSavedId(null);
    let ok = false;
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...changes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `Ændringen for ${row.name} blev ikke gemt. Prøv igen.`);
      } else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...local } : r)));
        setSavedId(row.id);
        ok = true;
      }
    } catch {
      setError(`Ændringen for ${row.name} blev ikke gemt, fordi forbindelsen fejlede.`);
    }
    setSavingId(null);
    return ok;
  }

  const assign = (row: StaffRow, slug: string) =>
    void patch(row, { location_slug: slug || null }, { location_slug: slug || null });

  async function resetPassword(row: StaffRow) {
    const password = generatePassword();
    if (await patch(row, { password }, {})) setHandover({ name: row.name, email: row.email, password });
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
    {
      key: "role",
      header: "Rolle",
      hideBelow: "sm",
      className: "w-[160px]",
      render: (r) =>
        r.role === "owner" ? (
          ROLE_LABELS.owner
        ) : (
          <Select
            aria-label={`Rolle for ${r.name}`}
            value={r.role}
            disabled={savingId === r.id}
            onChange={(e) => void patch(r, { role: e.target.value }, { role: e.target.value })}
            className="!h-9 !text-[14px]"
          >
            <option value="employee">{ROLE_LABELS.employee}</option>
            <option value="manager">{ROLE_LABELS.manager}</option>
          </Select>
        ),
    },
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
                onChange={(e) => assign(r, e.target.value)}
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
    {
      key: "actions",
      header: "",
      className: "w-[200px]",
      render: (r) =>
        r.role === "owner" ? null : (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="quiet" disabled={savingId === r.id} onClick={() => void resetPassword(r)}>
              Ny kode
            </Button>
            <Button
              size="sm"
              variant={r.is_active ? "danger" : "secondary"}
              disabled={savingId === r.id}
              onClick={() => void patch(r, { is_active: !r.is_active }, { is_active: !r.is_active })}
            >
              {r.is_active ? "Deaktivér" : "Aktivér"}
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title="Medarbejdere"
        description="Hver medarbejder hører til én butik og ser kun den butiks reparationer, henvendelser, opkøb og ordrer. Du som ejer ser alle butikker og kan skifte i topbjælken."
        actions={
          !showNew && (
            <Button
              variant="primary"
              onClick={() => {
                setShowNew(true);
                setHandover(null);
              }}
            >
              Ny medarbejder
            </Button>
          )
        }
      />
      {handover && (
        <div className="mb-4">
          <Notice tone="success" title={`Login til ${handover.name}`}>
            <p>
              E-mail: <strong>{handover.email}</strong>
              <br />
              Adgangskode: <strong className="font-mono tracking-wide">{handover.password}</strong>
            </p>
            <p className="mt-2 text-[13px]">Giv koden videre nu. Den vises ikke igen. Login sker på phonespot.dk/admin.</p>
            <div className="mt-3">
              <Button size="sm" onClick={() => setHandover(null)}>
                Skjul
              </Button>
            </div>
          </Notice>
        </div>
      )}
      {showNew && (
        <NewStaffForm
          stores={stores}
          onCancel={() => setShowNew(false)}
          onCreated={(row, password) => {
            setRows((prev) => [row, ...prev]);
            setShowNew(false);
            setHandover({ name: row.name, email: row.email, password });
          }}
        />
      )}
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
        empty={{ title: "Ingen medarbejdere endnu", description: "Tryk på Ny medarbejder for at oprette den første." }}
      />
    </div>
  );
}

function NewStaffForm({
  stores,
  onCancel,
  onCreated,
}: {
  stores: StoreOption[];
  onCancel: () => void;
  onCreated: (row: StaffRow, password: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [store, setStore] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, location_slug: store, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Medarbejderen blev ikke oprettet. Prøv igen.");
      else onCreated(json.staff as StaffRow, password);
    } catch {
      setError("Medarbejderen blev ikke oprettet, fordi forbindelsen fejlede.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="mb-6 flex flex-col gap-4 rounded-xl border border-sand bg-white p-5">
      <h2 className="text-[17px] font-semibold text-charcoal">Ny medarbejder</h2>
      <FieldRow>
        <Field label="Navn" required>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required />}
        </Field>
        <Field label="E-mail" required hint="Bruges til login.">
          {(id) => (
            <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required />
          )}
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Butik" required>
          {(id) => (
            <Select id={id} value={store} onChange={(e) => setStore(e.target.value)} required>
              <option value="">Vælg butik</option>
              {stores.map((s) => (
                <option key={s.slug} value={s.slug} disabled={!s.available}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Rolle" required hint="Butikschef kan også se kostpriser og rette reparationspriser.">
          {(id) => (
            <Select id={id} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">{ROLE_LABELS.employee}</option>
              <option value="manager">{ROLE_LABELS.manager}</option>
            </Select>
          )}
        </Field>
      </FieldRow>
      <Field label="Adgangskode" required hint={`Mindst ${MIN_PASSWORD_LENGTH} tegn. Den vises én gang, når profilen er oprettet.`}>
        {(id) => (
          <div className="flex gap-2">
            <Input
              id={id}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="font-mono"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <Button onClick={() => setPassword(generatePassword())}>Ny kode</Button>
          </div>
        )}
      </Field>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="flex justify-end gap-2">
        <Button variant="quiet" onClick={onCancel}>
          Annuller
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          Opret medarbejder
        </Button>
      </div>
    </form>
  );
}
