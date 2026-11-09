"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, FieldRow, Input, Notice, Section, Segmented, Select } from "@/components/admin/ui";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { confirmBlockers, ID_TYPE_LABELS, ID_TYPES, idRequired, INVOICE_TYPES, type IdType, type InvoiceType, type PayoutMethod } from "@/lib/opkoeb/rules";
import { ItemRow } from "./item-row";
import { loadInquiryPrefill } from "./inquiry-prefill";
import {
  emailError,
  emptyForm,
  emptyItem,
  fieldError,
  formatKr,
  formFromReceipt,
  idNumberError,
  INVOICE_TYPE_LABELS,
  toDraftPayload,
  toRulesInput,
  totalOere,
  type ItemForm,
  type ReceiptForm,
} from "./receipt-form";

const AUTOSAVE_MS = 1000;

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export type StoreOption = { id: string; name: string };

const detailHref = (id: string) => `/admin/opkoeb/slutsedler/${id}`;

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

/** Sætter ?kladde=<id> i adressen, så en genindlæsning åbner samme kladde. */
function rememberDraftInUrl(id: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("kladde") === id) return;
  url.searchParams.set("kladde", id);
  window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[14px] text-charcoal">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-sand accent-[#1A3D2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light"
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * Opkøb ved disken: enheder, sælger, tjek, udbetaling og "Bekræft og print".
 * Kladden oprettes ved første indtastning og gemmes derefter løbende.
 */
export function ReceiptEditor({
  locationId,
  inquiryId,
  draftId,
  stores = [],
}: {
  locationId: string;
  inquiryId?: string;
  /** En gemt kladde, der skal åbnes igen (?kladde=). */
  draftId?: string;
  /** Butikker at vælge mellem (ejeren). Låses, når kladden er oprettet. */
  stores?: StoreOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ReceiptForm>(emptyForm);
  const [location, setLocation] = useState(locationId);
  const [loading, setLoading] = useState(Boolean(draftId || inquiryId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [cvrBusy, setCvrBusy] = useState(false);
  const [cvrError, setCvrError] = useState<string | null>(null);
  const [focusItemKey, setFocusItemKey] = useState<string | null>(null);

  const formRef = useRef(form);
  formRef.current = form;
  const locationRef = useRef(location);
  locationRef.current = location;
  const receiptIdRef = useRef<string | null>(null);
  const touched = useRef(false);
  const confirmedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Gemninger kører én ad gangen, så der aldrig oprettes to kladder. */
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));

  /* ---- Indlæsning: gemt kladde, henvendelse eller tom ---- */
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!draftId && !inquiryId) return;

    const adopt = (r: Record<string, unknown>) => {
      const id = String(r.id);
      receiptIdRef.current = id;
      setReceiptId(id);
      if (typeof r.location_id === "string") setLocation(r.location_id);
      setForm(formFromReceipt(r));
      setSave({ kind: "saved" });
      rememberDraftInUrl(id);
    };

    (async () => {
      try {
        if (draftId) {
          const res = await staffFetch(`/api/trade-in/receipts/${draftId}`);
          if (!res.ok) throw new Error(await errorMessage(res, "Kladden kunne ikke hentes"));
          const r = (await res.json()) as Record<string, unknown>;
          if (r.status !== "draft") {
            router.replace(detailHref(String(r.id)));
            return;
          }
          adopt(r);
          return;
        }
        if (inquiryId) {
          const res = await staffFetch(`/api/trade-in/receipts?inquiry_id=${encodeURIComponent(inquiryId)}`);
          if (!res.ok) throw new Error(await errorMessage(res, "Henvendelsens slutsedler kunne ikke hentes"));
          const list = (await res.json()) as Array<Record<string, unknown>>;
          const done = list.find((r) => r.status !== "draft" && r.status !== "voided");
          if (done) {
            router.replace(detailHref(String(done.id)));
            return;
          }
          const draft = list.find((r) => r.status === "draft");
          if (draft) {
            adopt(draft);
            return;
          }
          setForm(await loadInquiryPrefill(inquiryId));
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Kunne ikke hente opkøbet");
      } finally {
        setLoading(false);
      }
    })();
  }, [draftId, inquiryId, router]);

  /* ---- Gem ---- */
  const persist = useCallback((): Promise<boolean> => {
    const run = async (): Promise<boolean> => {
      if (confirmedRef.current) return true;
      setSave({ kind: "saving" });
      try {
        const payload = toDraftPayload(formRef.current);
        const id = receiptIdRef.current;
        const res = id
          ? await staffFetch(`/api/trade-in/receipts/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await staffFetch("/api/trade-in/receipts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, location_id: locationRef.current }),
            });
        if (!res.ok) {
          const message = await errorMessage(res, "Prøv igen om lidt.");
          setSave({ kind: "error", message: `Kladden blev ikke gemt. ${message}` });
          if (res.status === 409 && id) router.replace(detailHref(id));
          return false;
        }
        if (!id) {
          const created = (await res.json()) as { id: string };
          receiptIdRef.current = created.id;
          setReceiptId(created.id);
          rememberDraftInUrl(created.id);
        }
        setSave({ kind: "saved" });
        return true;
      } catch {
        setSave({ kind: "error", message: "Kladden blev ikke gemt. Tjek forbindelsen, og prøv igen." });
        return false;
      }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  }, [router]);

  // Autogem: først når personalet har skrevet noget, derefter 1 s efter sidste ændring.
  useEffect(() => {
    if (!touched.current || confirmedRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void persist();
    }, AUTOSAVE_MS);
  }, [form, persist]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const update = useCallback((patch: Partial<ReceiptForm>) => {
    touched.current = true;
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const updateItem = useCallback((key: string, patch: Partial<ItemForm>) => {
    touched.current = true;
    setForm((f) => ({ ...f, items: f.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  }, []);

  function addItem() {
    const item = emptyItem();
    setFocusItemKey(item.key);
    touched.current = true;
    setForm((f) => ({ ...f, items: [...f.items, item] }));
  }

  function removeItem(key: string) {
    touched.current = true;
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.key !== key) }));
  }

  /* ---- CVR ---- */
  async function lookupCvr() {
    const cvr = form.seller_cvr.replace(/\D/g, "");
    if (!/^\d{8}$/.test(cvr)) {
      setCvrError("CVR skal være 8 cifre");
      return;
    }
    setCvrBusy(true);
    setCvrError(null);
    try {
      const res = await staffFetch(`/api/customers/cvr?cvr=${cvr}`);
      if (!res.ok) {
        setCvrError(await errorMessage(res, "CVR-opslaget fejlede"));
        return;
      }
      const c = (await res.json()) as { company_name: string; address: string | null; zip: string | null; city: string | null };
      update({
        seller_cvr: cvr,
        seller_name: c.company_name,
        seller_address: c.address ?? form.seller_address,
        seller_postal_city: [c.zip, c.city].filter(Boolean).join(" ") || form.seller_postal_city,
      });
    } catch {
      setCvrError("CVR-opslaget fejlede. Tjek forbindelsen.");
    } finally {
      setCvrBusy(false);
    }
  }

  /* ---- Afledt ---- */
  const total = totalOere(form);
  const needsId = idRequired(total);
  const blockers = useMemo(() => confirmBlockers(toRulesInput(form), copenhagenDateString()), [form]);
  const business = form.seller_type === "business";
  const locked = confirmed || confirming || loading;

  /* ---- Bekræft og print ---- */
  async function confirmAndPrint() {
    if (blockers.length > 0 || confirming) return;
    setConfirming(true);
    setConfirmError(null);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // Fanen åbnes med det samme i klikket, ellers stopper browseren den som popup.
    const tab = window.open("", "_blank");
    const fail = (message: string) => {
      tab?.close();
      setConfirmError(message);
      setConfirming(false);
    };

    const saved = await persist();
    const id = receiptIdRef.current;
    if (!saved || !id) return fail("Kladden kunne ikke gemmes, så opkøbet er ikke bekræftet.");

    try {
      const res = await staffFetch(`/api/trade-in/receipts/${id}/confirm`, { method: "POST" });
      if (!res.ok) return fail(await errorMessage(res, "Opkøbet kunne ikke bekræftes."));
    } catch {
      return fail("Opkøbet kunne ikke bekræftes. Tjek forbindelsen, og prøv igen.");
    }

    confirmedRef.current = true;
    setConfirmed(true);
    const pdf = `/api/trade-in/receipts/${id}/pdf`;
    if (tab) tab.location.href = pdf;
    else window.open(pdf, "_blank");
    router.push(detailHref(id));
  }

  if (loadError) {
    return <Notice tone="danger" title="Opkøbet kunne ikke åbnes">{loadError}</Notice>;
  }

  const storeName = stores.find((s) => s.id === location)?.name;

  return (
    <div className="flex max-w-[760px] flex-col gap-8">
      {stores.length > 1 && (
        <div className="max-w-[320px]">
          <Field label="Butik" hint={receiptId ? "Butikken kan ikke skiftes, når kladden er oprettet." : undefined}>
            {(id) => (
              <Select id={id} value={location} disabled={!!receiptId || locked} onChange={(e) => setLocation(e.target.value)}>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}
      {stores.length === 1 && storeName && <p className="-mt-4 text-[13px] text-gray">{storeName}</p>}

      {loading && <p className="text-[14px] text-gray">Henter opkøbet …</p>}

      <Section
        title="Enheder"
        description="Scan IMEI. Enter går videre til næste felt."
        aside={
          <Button size="sm" onClick={addItem} disabled={locked}>
            Tilføj enhed
          </Button>
        }
      >
        <div className="flex flex-col">
          {form.items.map((item, i) => (
            <ItemRow
              key={item.key}
              item={item}
              index={i}
              autoFocus={focusItemKey ? focusItemKey === item.key : i === 0}
              removable={form.items.length > 1}
              disabled={locked}
              onChange={(patch) => updateItem(item.key, patch)}
              onRemove={() => removeItem(item.key)}
            />
          ))}
          {form.items.length === 0 && <p className="text-[14px] text-gray">Ingen enheder. Tilføj den første.</p>}
        </div>
      </Section>

      <Section title="Sælger">
        <Segmented
          label="Sælgertype"
          value={form.seller_type}
          onChange={(v) => update({ seller_type: v })}
          options={[
            { value: "private", label: "Privat" },
            { value: "business", label: "Firma" },
          ]}
        />
        {business && (
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <Field label="CVR-nummer" error={cvrError ?? fieldError("cvr", form.seller_cvr)} className="flex-1">
                {(id) => (
                  <Input
                    id={id}
                    value={form.seller_cvr}
                    inputMode="numeric"
                    disabled={locked}
                    onChange={(e) => update({ seller_cvr: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void lookupCvr();
                      }
                    }}
                  />
                )}
              </Field>
              <Button onClick={() => void lookupCvr()} loading={cvrBusy} disabled={locked}>
                Slå op i CVR
              </Button>
            </div>
            <Field label="Fakturatype" hint="Hvilken faktura firmaet udsteder til os.">
              {(id) => (
                <Select
                  id={id}
                  value={form.invoice_type}
                  disabled={locked}
                  onChange={(e) => update({ invoice_type: e.target.value as InvoiceType | "" })}
                >
                  <option value="">Vælg</option>
                  {INVOICE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {INVOICE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}
        <Field label={business ? "Firmanavn" : "Navn"}>
          {(id) => <Input id={id} value={form.seller_name} disabled={locked} autoComplete="off" onChange={(e) => update({ seller_name: e.target.value })} />}
        </Field>
        <FieldRow>
          <Field label="Adresse">
            {(id) => <Input id={id} value={form.seller_address} disabled={locked} autoComplete="off" onChange={(e) => update({ seller_address: e.target.value })} />}
          </Field>
          <Field label="Postnr. og by">
            {(id) => (
              <Input id={id} value={form.seller_postal_city} disabled={locked} autoComplete="off" onChange={(e) => update({ seller_postal_city: e.target.value })} />
            )}
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Telefon">
            {(id) => <Input id={id} type="tel" value={form.seller_phone} disabled={locked} onChange={(e) => update({ seller_phone: e.target.value })} />}
          </Field>
          <Field label="E-mail" hint="Slutsedlen sendes hertil." error={emailError(form.seller_email)}>
            {(id) => <Input id={id} type="email" value={form.seller_email} disabled={locked} onChange={(e) => update({ seller_email: e.target.value })} />}
          </Field>
        </FieldRow>
      </Section>

      <Section title="Tjek">
        {!business && (
          <Checkbox
            label="Sælger er fyldt 18"
            checked={form.seller_age_confirmed}
            disabled={locked}
            onChange={(v) => update({ seller_age_confirmed: v })}
          />
        )}
        <Checkbox
          label="Find My/iCloud er slået fra, og enheden er ikke spærret eller meldt stjålet"
          checked={form.lock_checks_confirmed}
          disabled={locked}
          onChange={(v) => update({ lock_checks_confirmed: v })}
        />
        {needsId && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-gray">Opkøbet er over 2.000 kr., så sælger skal vise ID.</p>
            <FieldRow cols={3}>
              <Field label="ID-type">
                {(id) => (
                  <Select id={id} value={form.id_type} disabled={locked} onChange={(e) => update({ id_type: e.target.value as IdType | "" })}>
                    <option value="">Vælg</option>
                    {ID_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ID_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="ID-nummer" hint="Skriv ikke CPR-nummer." error={idNumberError(form.id_number)}>
                {(id) => <Input id={id} value={form.id_number} disabled={locked} autoComplete="off" onChange={(e) => update({ id_number: e.target.value })} />}
              </Field>
              {form.id_type !== "mitid" && (
                <Field label="Udløbsdato">
                  {(id) => <Input id={id} type="date" value={form.id_expiry} disabled={locked} onChange={(e) => update({ id_expiry: e.target.value })} />}
                </Field>
              )}
            </FieldRow>
          </div>
        )}
      </Section>

      <Section title="Udbetaling">
        <Segmented<PayoutMethod | "">
          label="Udbetaling"
          value={form.payout_method}
          onChange={(v) => update({ payout_method: v })}
          options={[
            { value: "bank", label: "Bank" },
            { value: "modregning", label: "Modregnes i køb i kassen" },
          ]}
        />
        {form.payout_method === "bank" && (
          <>
            <FieldRow>
              <Field label="Reg.nr." error={fieldError("reg", form.seller_bank_reg)}>
                {(id) => (
                  <Input id={id} value={form.seller_bank_reg} inputMode="numeric" disabled={locked} autoComplete="off" onChange={(e) => update({ seller_bank_reg: e.target.value })} />
                )}
              </Field>
              <Field label="Kontonummer" error={fieldError("account", form.seller_bank_account)}>
                {(id) => (
                  <Input
                    id={id}
                    value={form.seller_bank_account}
                    inputMode="numeric"
                    disabled={locked}
                    autoComplete="off"
                    onChange={(e) => update({ seller_bank_account: e.target.value })}
                  />
                )}
              </Field>
            </FieldRow>
            <Checkbox
              label="Kontoen står i sælgers navn"
              checked={form.account_owner_confirmed}
              disabled={locked}
              onChange={(v) => update({ account_owner_confirmed: v })}
            />
          </>
        )}
        {form.payout_method === "modregning" && (
          <p className="text-[13px] text-gray">Beløbet trækkes fra sælgers køb, når det slås op i kassen på slutseddelnummeret.</p>
        )}
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-4 border-t border-sand bg-cream px-4 py-5 sm:mx-0 sm:px-0">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[14px] text-gray">Total</p>
          <p className="text-[26px] font-semibold tabular-nums text-charcoal">{formatKr(total)}</p>
        </div>

        {blockers.length > 0 ? (
          <ul aria-label="Mangler før bekræftelse" className="flex flex-col gap-1 text-[13px] text-[#8A4B08]">
            {blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-green-eco">Alt er udfyldt. Klar til at bekræfte.</p>
        )}

        {confirmError && <Notice tone="danger" title="Opkøbet er ikke bekræftet">{confirmError}</Notice>}

        <div className="flex items-center justify-between gap-4">
          <p aria-live="polite" className={`text-[13px] ${save.kind === "error" ? "text-[#B42318]" : "text-gray"}`}>
            {save.kind === "saving" ? "Gemmer …" : save.kind === "saved" ? "Gemt" : save.kind === "error" ? save.message : ""}
          </p>
          <Button variant="primary" onClick={() => void confirmAndPrint()} disabled={blockers.length > 0 || locked} loading={confirming}>
            Bekræft og print
          </Button>
        </div>
      </div>
    </div>
  );
}
