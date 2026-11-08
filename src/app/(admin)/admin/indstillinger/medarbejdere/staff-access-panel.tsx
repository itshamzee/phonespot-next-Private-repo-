"use client";

import { useState } from "react";
import { Button, Field, Input, Tag } from "@/components/admin/ui";
import { ENFORCED_PERMISSIONS, PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULTS, type Permission } from "@/lib/auth/permissions";
import { isValidPin } from "@/lib/auth/pin";

export type AccessTarget = {
  id: string;
  name: string;
  role: string;
  permissions: Permission[];
  hasPin: boolean;
  pinLocked: boolean;
};

/**
 * Tilladelser og pinkode for én medarbejder. Rollens standard vises som valgt
 * og kan ikke fjernes ("Følger rollen"); kun ekstra tilladelser gemmes.
 */
export function StaffAccessPanel({
  row,
  saving,
  onSave,
  onClose,
}: {
  row: AccessTarget;
  saving: boolean;
  onSave: (changes: Record<string, unknown>, local: Partial<AccessTarget>) => Promise<boolean>;
  onClose: () => void;
}) {
  const defaults = ROLE_DEFAULTS[row.role] ?? [];
  const [pin, setPin] = useState("");
  const pinProblem = pin !== "" && !isValidPin(pin) ? "Pinkoden skal være 4–6 cifre" : null;

  function toggle(p: Permission) {
    const next = row.permissions.includes(p) ? row.permissions.filter((x) => x !== p) : [...row.permissions, p];
    void onSave({ permissions: next }, { permissions: next });
  }

  async function setNewPin() {
    if (!isValidPin(pin)) return;
    if (await onSave({ pin }, { hasPin: true, pinLocked: false })) setPin("");
  }

  return (
    <section
      aria-label={`Tilladelser og pinkode for ${row.name}`}
      className="mb-6 flex flex-col gap-5 rounded-xl border border-sand bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-charcoal">{row.name}: tilladelser og pinkode</h2>
        <Button size="sm" variant="quiet" onClick={onClose}>
          Luk
        </Button>
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-charcoal">Tilladelser</h3>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {PERMISSIONS.map((p) => {
            const byRole = defaults.includes(p);
            return (
              <li key={p}>
                <label className="flex items-center gap-2 text-[14px] text-charcoal">
                  <input
                    type="checkbox"
                    checked={byRole || row.permissions.includes(p)}
                    disabled={byRole || saving}
                    onChange={() => toggle(p)}
                  />
                  <span>{PERMISSION_LABELS[p]}</span>
                  {byRole && <span className="text-[12px] text-gray">Følger rollen</span>}
                  {!ENFORCED_PERMISSIONS.includes(p) && !(byRole && p === "se_indkoebspris") && (
                    <span className="text-[12px] text-gray">Træder i kraft senere</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-charcoal">
          Pinkode
          {row.pinLocked ? <Tag tone="amber">Låst</Tag> : row.hasPin ? <Tag tone="neutral">Sat</Tag> : <Tag tone="neutral">Ingen</Tag>}
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[200px]">
            <Field label="Ny pinkode" hint="4–6 cifre. Bruges til skift af ekspedient i kassen." error={pinProblem ?? undefined}>
              {(id) => (
                <Input
                  id={id}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="off"
                  className="font-mono"
                />
              )}
            </Field>
          </div>
          <Button variant="primary" disabled={saving || !isValidPin(pin)} onClick={() => void setNewPin()}>
            Sæt
          </Button>
          {row.hasPin && (
            <Button
              variant="danger"
              disabled={saving}
              onClick={() => void onSave({ pin: null }, { hasPin: false, pinLocked: false })}
            >
              Fjern
            </Button>
          )}
        </div>
        {row.pinLocked && (
          <p className="mt-2 text-[13px] text-gray">Pinkoden er låst. Sæt en ny pinkode for at låse den op.</p>
        )}
      </div>
    </section>
  );
}
