"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Field, Notice, PageHeader, Section, Textarea, Input } from "@/components/admin/ui";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { ID_TYPE_LABELS, payBlockers, payoutRemainderOere, type IdType, type ReceiptForRules } from "@/lib/opkoeb/rules";
import { prepareUpload } from "./compress-image";
import { ReceiptDialog } from "./receipt-dialog";
import { apiErrorMessage, draftHref, StatusTag, SuspicionTag } from "./receipt-status";
import { formatKr, INVOICE_TYPE_LABELS } from "./receipt-form";
import { useStores } from "./use-receipt-lookups";

type Item = {
  id: string;
  device_id: string | null;
  brand: string | null;
  model: string | null;
  storage: string | null;
  imei_serial: string | null;
  price: number | null;
};

type Receipt = Record<string, unknown> & {
  id: string;
  status: string;
  trade_in_receipt_items?: Item[];
};

type UploadKind = "signed_scan" | "invoice" | "payout_proof";
type DialogKind = "pay" | "suspicion" | "release" | "void" | null;

const linkButton =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-sand bg-white px-4 text-[14px] font-medium text-charcoal transition-colors hover:bg-cream " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light focus-visible:ring-offset-2";
const uploadLabel =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-sand bg-white px-4 text-[14px] font-medium text-charcoal transition-colors hover:bg-cream " +
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-light has-[:focus-visible]:ring-offset-2";

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

function dateTime(iso: unknown): string {
  const s = str(iso);
  if (!s) return "–";
  return new Date(s).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Copenhagen" });
}

/**
 * Den rensede række har ingen filstier og et maskeret kontonummer. Reglerne
 * læser kun, om de findes, så has_*-flagene og en pladsholder erstatter dem.
 */
export function rulesInput(r: Receipt): ReceiptForRules {
  const items = r.trade_in_receipt_items ?? [];
  return {
    total_amount: num(r.total_amount) ?? 0,
    status: r.status,
    seller_type: r.seller_type === "business" ? "business" : "private",
    seller_cvr: str(r.seller_cvr),
    invoice_type: str(r.invoice_type) as ReceiptForRules["invoice_type"],
    seller_name: str(r.seller_name),
    seller_address: str(r.seller_address),
    seller_age_confirmed: r.seller_age_confirmed === true,
    lock_checks_confirmed: r.lock_checks_confirmed === true,
    id_type: str(r.id_type) as ReceiptForRules["id_type"],
    id_number: str(r.id_number),
    id_expiry: str(r.id_expiry),
    attestation: str(r.attestation),
    signed_scan_path: r.has_signed_scan ? "uploaded" : null,
    invoice_file_path: r.has_invoice ? "uploaded" : null,
    payout_method: str(r.payout_method) as ReceiptForRules["payout_method"],
    // Kontonummeret er maskeret i den rensede række; serverens has_bank_account siger, om reg.nr. og konto er gemt.
    // Pladsholderne består kun reglernes formatkrav; serveren afgør udbetalingen med de indtastede tal.
    seller_bank_reg: r.has_bank_account ? "0000" : null,
    seller_bank_account: r.has_bank_account ? "000000" : null,
    account_owner_confirmed: r.account_owner_confirmed === true,
    offset_amount: num(r.offset_amount),
    suspected_at: str(r.suspected_at),
    items: items.map((i) => ({ template_id: "x", imei_serial: i.imei_serial, price: i.price })),
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 text-[14px]">
      <dt className="text-gray">{label}</dt>
      <dd className="min-w-0 break-words text-charcoal">{children}</dd>
    </div>
  );
}

export function ReceiptDetail({ receiptId }: { receiptId: string }) {
  const base = `/api/trade-in/receipts/${receiptId}`;
  const { isOwner } = useStoreScope();
  const { stores } = useStores();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Dialogfelter
  const [note, setNote] = useState("");
  const [police, setPolice] = useState(false);
  const [reason, setReason] = useState("");
  const [reg, setReg] = useState("");
  const [account, setAccount] = useState("");
  const [ownerOk, setOwnerOk] = useState(false);

  const merge = useCallback((patch: Record<string, unknown>) => {
    // Handlingerne svarer med rækken uden varer; varerne beholdes.
    setReceipt((prev) => (prev ? ({ ...prev, ...patch } as Receipt) : prev));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await staffFetch(base);
        if (!res.ok) throw new Error(await apiErrorMessage(res, "Slutsedlen kunne ikke hentes"));
        const data = (await res.json()) as Receipt;
        if (!cancelled) setReceipt(data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Slutsedlen kunne ikke hentes");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base]);

  function openDialog(kind: Exclude<DialogKind, null>) {
    setDialogError(null);
    setNote("");
    setPolice(false);
    setReason("");
    setReg("");
    setAccount("");
    setOwnerOk(false);
    setDialog(kind);
  }

  async function send(url: string, method: string, body: unknown, fallback: string): Promise<boolean> {
    setBusy(true);
    setDialogError(null);
    try {
      const res = await staffFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setDialogError(await apiErrorMessage(res, fallback));
        return false;
      }
      merge((await res.json()) as Record<string, unknown>);
      setDialog(null);
      return true;
    } catch {
      setDialogError("Forbindelsen fejlede. Tjek nettet, og prøv igen.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function upload(kind: UploadKind, file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(kind);
    try {
      const prepared = await prepareUpload(file);
      if ("error" in prepared) {
        setUploadError(prepared.error);
        return;
      }
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", prepared.file);
      const res = await staffFetch(`${base}/upload`, { method: "POST", body: form });
      if (!res.ok) {
        setUploadError(await apiErrorMessage(res, "Filen kunne ikke gemmes"));
        return;
      }
      merge((await res.json()) as Record<string, unknown>);
    } catch {
      setUploadError("Filen kunne ikke gemmes. Tjek forbindelsen, og prøv igen.");
    } finally {
      setUploading(null);
    }
  }

  const header = (
    <PageHeader title="Slutseddel" backHref="/admin/opkoeb/slutsedler" backLabel="Slutsedler" />
  );
  if (loadError) {
    return (
      <>
        {header}
        <Notice tone="danger" title="Slutsedlen kunne ikke åbnes">
          {loadError}
        </Notice>
      </>
    );
  }
  if (!receipt) {
    return (
      <>
        {header}
        <p className="text-[14px] text-gray">Henter …</p>
      </>
    );
  }

  const r = receipt;
  const items = r.trade_in_receipt_items ?? [];
  const status = r.status;
  const business = r.seller_type === "business";
  const suspected = Boolean(str(r.suspected_at));
  const offset = num(r.offset_amount) ?? 0;
  const total = num(r.total_amount) ?? 0;
  const rules = rulesInput(r);
  const remainder = payoutRemainderOere(rules);
  const blockers = status === "confirmed" ? payBlockers(rules) : [];
  const locked = status === "confirmed" || status === "paid";
  const storeName = stores.find((s) => s.id === r.location_id)?.name;
  const number = str(r.receipt_number);
  const idType = str(r.id_type) as IdType | null;

  const canSuspect = locked && !suspected;
  const canVoid = status === "confirmed" && !suspected;

  const scanKind: UploadKind = business ? "invoice" : "signed_scan";
  const scanHas = business ? Boolean(r.has_invoice) : Boolean(r.has_signed_scan);
  const scanLabel = business ? "Læg firmaets faktura op" : "Læg underskrevet seddel op";

  const uploadControls = (kind: UploadKind, label: string, camera: boolean) => (
    <div key={kind} className="flex flex-wrap gap-2">
      <label className={uploadLabel}>
        {uploading === kind ? "Gemmer …" : label}
        <input
          type="file"
          aria-label={label}
          accept="image/*,application/pdf"
          className="sr-only"
          disabled={uploading !== null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void upload(kind, file);
          }}
        />
      </label>
      {camera && (
        <label className={`${uploadLabel} md:hidden`}>
          Tag billede
          <input
            type="file"
            aria-label="Tag billede"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={uploading !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void upload(kind, file);
            }}
          />
        </label>
      )}
    </div>
  );

  const pageTitle = number ? number : "Kladde";

  return (
    <>
      <PageHeader
        title={pageTitle}
        backHref="/admin/opkoeb/slutsedler"
        backLabel="Slutsedler"
        actions={
          <>
            <StatusTag status={status} />
            {suspected && <SuspicionTag />}
          </>
        }
      />

      <div className="grid max-w-[980px] gap-10 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-8">
          {status === "draft" && (
            <Notice
              tone="info"
              title="Kladden er ikke bekræftet"
              action={
                <Link href={draftHref(r.id)} className={linkButton}>
                  Fortsæt kladde
                </Link>
              }
            >
              Der er ikke nogen slutseddel at printe eller udbetale, før kladden er bekræftet.
            </Notice>
          )}
          {suspected && (
            <Notice tone="danger" title="Opkøbet er spærret ved mistanke">
              {str(r.suspicion_note) ?? "Enhederne er spærret."}
              {str(r.police_notified_at) ? ` Politiet er underrettet ${dateTime(r.police_notified_at)}.` : ""}
            </Notice>
          )}
          {status === "voided" && <Notice tone="warning" title="Slutsedlen er annulleret" />}

          <Section title="Sælger">
            <dl className="flex flex-col gap-2">
              <Row label="Navn">{str(r.seller_name) ?? "–"}</Row>
              <Row label="Type">
                {business ? `Firma${str(r.seller_cvr) ? `, CVR ${r.seller_cvr}` : ""}` : "Privat"}
                {business && str(r.invoice_type) ? ` (${INVOICE_TYPE_LABELS[r.invoice_type as keyof typeof INVOICE_TYPE_LABELS] ?? r.invoice_type})` : ""}
              </Row>
              <Row label="Adresse">{[str(r.seller_address), str(r.seller_postal_city)].filter(Boolean).join(", ") || "–"}</Row>
              <Row label="ID">{idType ? `${ID_TYPE_LABELS[idType]} ${str(r.id_number) ?? ""}`.trim() : "Ikke krævet"}</Row>
              <Row label="Butik">{storeName ?? "–"}</Row>
              <Row label="Oprettet">
                {dateTime(r.created_at)} af {str(r.created_by_name) ?? "–"}
              </Row>
              {status !== "draft" && <Row label="Bekræftet den">
                  {dateTime(r.confirmed_at)} af {str(r.confirmed_by_name) ?? "–"}
                </Row>}
              {str(r.paid_at) && (
                <Row label="Udbetalt den">
                  {dateTime(r.paid_at)} af {str(r.paid_by_name) ?? "–"}
                </Row>
              )}
            </dl>
          </Section>

          <Section title="Enheder">
            <ul className="flex flex-col divide-y divide-sand rounded-xl border border-sand bg-white">
              {items.length === 0 && <li className="px-4 py-3 text-[14px] text-gray">Ingen enheder.</li>}
              {items.map((i) => {
                const label = [i.brand, i.model, i.storage].filter(Boolean).join(" ") || "Enhed";
                return (
                  <li key={i.id} className="flex items-baseline justify-between gap-4 px-4 py-3 text-[14px]">
                    <div className="min-w-0">
                      {i.device_id ? (
                        <Link href={`/admin/platform/stock/${i.device_id}`} className="font-medium text-green-eco underline-offset-2 hover:underline">
                          {label}
                        </Link>
                      ) : (
                        <span className="font-medium text-charcoal">{label}</span>
                      )}
                      <p className="text-[13px] text-gray">{i.imei_serial ?? "Uden IMEI/serienummer"}</p>
                    </div>
                    <span className="shrink-0 tabular-nums text-charcoal">{formatKr(i.price ?? 0)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col items-end gap-1 text-[14px]">
              <p className="text-[18px] font-semibold tabular-nums text-charcoal">Total {formatKr(total)}</p>
              {offset > 0 && (
                <>
                  <p className="text-gray">Modregnet i køb: {formatKr(offset)}</p>
                  <p className="text-gray">Kun resten, {formatKr(remainder)}, udbetales til bank.</p>
                </>
              )}
            </div>
          </Section>

          {locked && (
            <Section title="Dokumenter" description={business ? "Firmaets faktura skal ligge her, før der udbetales." : "Den underskrevne slutseddel skal ligge her, før der udbetales."}>
              <ul className="flex flex-col gap-1 text-[14px]">
                {r.has_signed_scan === true && (
                  <li>
                    <a href={`${base}/files/signed_scan`} target="_blank" rel="noopener noreferrer" className="text-green-eco underline-offset-2 hover:underline">
                      Se underskrevet seddel
                    </a>
                  </li>
                )}
                {r.has_invoice === true && (
                  <li>
                    <a href={`${base}/files/invoice`} target="_blank" rel="noopener noreferrer" className="text-green-eco underline-offset-2 hover:underline">
                      Se firmaets faktura
                    </a>
                  </li>
                )}
                {r.has_payout_proof === true && (
                  <li>
                    <a href={`${base}/files/payout_proof`} target="_blank" rel="noopener noreferrer" className="text-green-eco underline-offset-2 hover:underline">
                      Se udbetalingsbevis
                    </a>
                  </li>
                )}
                {!r.has_signed_scan && !r.has_invoice && !r.has_payout_proof && <li className="text-gray">Ingen filer lagt op endnu.</li>}
              </ul>
              {uploadError && (
                <p role="alert" className="text-[13px] text-[#B42318]">
                  {uploadError}
                </p>
              )}
            </Section>
          )}
        </div>

        {status !== "draft" && (
          <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
            {status !== "voided" && (
              <a href={`${base}/pdf`} target="_blank" rel="noopener noreferrer" className={linkButton}>
                Print slutseddel
              </a>
            )}

            {locked && (
              <>
                {uploadControls(scanKind, scanLabel, true)}
                {scanHas && <p className="text-[13px] text-green-eco">{business ? "Fakturaen er lagt op." : "Den underskrevne seddel er lagt op."}</p>}
                {status === "paid" && !r.has_payout_proof && uploadControls("payout_proof", "Læg udbetalingsbevis op", false)}
              </>
            )}

            {status === "confirmed" && (
              <div className="flex flex-col gap-2 border-t border-sand pt-3">
                <Button variant="primary" disabled={blockers.length > 0} onClick={() => openDialog("pay")}>
                  Marker som udbetalt
                </Button>
                {blockers.length > 0 && (
                  <ul aria-label="Mangler før udbetaling" className="flex flex-col gap-1 text-[13px] text-[#8A4B08]">
                    {blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {status === "paid" && <p className="border-t border-sand pt-3 text-[13px] text-green-eco">Udbetalt {dateTime(r.paid_at)}.</p>}

            {(canSuspect || canVoid || (suspected && isOwner)) && (
              <div className="flex flex-col gap-2 border-t border-sand pt-3">
                {canSuspect && (
                  <Button variant="danger" onClick={() => openDialog("suspicion")}>
                    Mistanke om tyveri
                  </Button>
                )}
                {suspected && isOwner && <Button onClick={() => openDialog("release")}>Ophæv mistanke</Button>}
                {canVoid && (
                  <Button variant="danger" onClick={() => openDialog("void")}>
                    Annullér slutseddel
                  </Button>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {dialog === "pay" && (
        <ReceiptDialog
          title="Marker som udbetalt"
          submitLabel="Bekræft udbetaling"
          canSubmit={/^\d{4}$/.test(reg) && /^\d{6,10}$/.test(account) && ownerOk}
          busy={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={() =>
            void send(
              `${base}/pay`,
              "POST",
              { payout_method: "bank", seller_bank_reg: reg, seller_bank_account: account, account_owner_confirmed: true },
              "Udbetalingen kunne ikke markeres",
            )
          }
        >
          <p>
            Udbetales til bank: <strong className="tabular-nums">{formatKr(remainder)}</strong>
          </p>
          <p className="text-[13px] text-gray">
            Konto på slutsedlen: reg. {str(r.seller_bank_reg) ?? "–"}, konto {str(r.seller_bank_account) ?? "–"}. Tast reg.nr. og kontonummer igen, så de kan sammenlignes med slutsedlen.
          </p>
          <Field label="Reg.nr.">
            {(id) => <Input id={id} inputMode="numeric" autoComplete="off" maxLength={4} value={reg} onChange={(e) => setReg(e.target.value.replace(/\D/g, ""))} />}
          </Field>
          <Field label="Kontonummer">
            {(id) => <Input id={id} inputMode="numeric" autoComplete="off" maxLength={10} value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))} />}
          </Field>
          <label className="flex cursor-pointer items-start gap-3 text-[14px]">
            <input type="checkbox" checked={ownerOk} onChange={(e) => setOwnerOk(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-sand accent-[#1A3D2E]" />
            <span>Kontoen står i sælgers navn</span>
          </label>
        </ReceiptDialog>
      )}

      {dialog === "suspicion" && (
        <ReceiptDialog
          title="Mistanke om tyveri"
          submitLabel="Markér mistanke"
          submitVariant="danger"
          canSubmit={note.trim().length > 0}
          busy={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={() => void send(`${base}/suspicion`, "POST", { note: note.trim(), police_notified: police }, "Mistanken kunne ikke markeres")}
        >
          <p className="text-[13px] text-gray">Udbetaling og annullering spærres, og enhederne tages af lager. Kun ejeren kan ophæve mistanken.</p>
          <Field label="Note" hint="Hvad gav anledning til mistanken?">
            {(id) => <Textarea id={id} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
          <label className="flex cursor-pointer items-start gap-3 text-[14px]">
            <input type="checkbox" checked={police} onChange={(e) => setPolice(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-sand accent-[#1A3D2E]" />
            <span>Politiet er underrettet</span>
          </label>
        </ReceiptDialog>
      )}

      {dialog === "release" && (
        <ReceiptDialog
          title="Ophæv mistanke"
          submitLabel="Ophæv mistanke"
          canSubmit={note.trim().length > 0}
          busy={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={() => void send(`${base}/suspicion`, "DELETE", { note: note.trim() }, "Mistanken kunne ikke ophæves")}
        >
          <p className="text-[13px] text-gray">Spærringen på enhederne fjernes, og enheder, der blev taget af lager, går tilbage til modtagelse.</p>
          <Field label="Note">{(id) => <Textarea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        </ReceiptDialog>
      )}

      {dialog === "void" && (
        <ReceiptDialog
          title="Annullér slutseddel"
          submitLabel="Bekræft annullering"
          submitVariant="danger"
          canSubmit={reason.trim().length > 0}
          busy={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={() => void send(`${base}/void`, "POST", { reason: reason.trim() }, "Slutsedlen kunne ikke annulleres")}
        >
          <p className="text-[13px] text-gray">Enhederne på sedlen spærres. En annullering kan ikke fortrydes.</p>
          <Field label="Begrundelse">{(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
        </ReceiptDialog>
      )}
    </>
  );
}
