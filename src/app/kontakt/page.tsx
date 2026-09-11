"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FormField } from "@/components/ui/form-field";
import { normalizeStoreId } from "@/lib/stores";
import { COMPANY_EMAIL, STORES } from "@/lib/store-config";
import styles from "@/components/ui/information.module.css";

type Status = "idle" | "submitting" | "success" | "error";
const STORE_OPTIONS = [STORES.vejle.city, STORES.slagelse.city];
const emptyForm = { name: "", email: "", subject: "Support", store: "", message: "" };

export default function KontaktPage() {
  const [formData, setFormData] = useState(emptyForm);
  const [status, setStatus] = useState<Status>("idle");
  const sending = useRef(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name, email: formData.email, subject: formData.subject,
          message: formData.message, store_id: normalizeStoreId(formData.store),
        }),
      });
      if (!res.ok) throw new Error("Contact request failed");
      setStatus("success");
      setFormData(emptyForm);
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / Kontakt</nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Vi hjælper dig videre</span>
          <h1>Kontakt os.</h1>
          <p className={styles.intro}>Spørgsmål til en ordre, en enhed eller en reparation? Skriv til os, ring eller kom forbi i Vejle eller Slagelse.</p>
          <div className={styles.actions}><a href={`tel:${STORES.slagelse.phone.replace(/\s/g, "")}`} className={styles.textLink}>{STORES.slagelse.phone}</a><a href={`mailto:${COMPANY_EMAIL}`} className={styles.textLink}>{COMPANY_EMAIL}</a><Link href="/butik" className={styles.textLink}>Find butik og åbningstider →</Link></div>
        </header>
        <section className={styles.section}>
          <div className={styles.grid}>
            <div>
              {status === "success" ? (
                <div className={styles.notice}>
                  <div role="status"><h2>Tak for din besked!</h2><p>Vi vender tilbage hurtigst muligt.</p></div>
                  <button type="button" onClick={() => setStatus("idle")} className={styles.button}>Send en ny besked</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.panel} aria-label="Kontaktformular" aria-busy={status === "submitting"}>
                  <h2>Send en besked</h2>
                  <p className="text-sm">Felter med * skal udfyldes.</p>
                  <fieldset disabled={status === "submitting"} className="space-y-5 border-0 p-0">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField label="Butik" name="store" type="select" required options={STORE_OPTIONS} placeholder="Vælg butik..." value={formData.store} onChange={handleChange} />
                      <FormField label="Emne" name="subject" type="select" options={["Support", "Salg", "Andet"]} placeholder="Vælg emne..." value={formData.subject} onChange={handleChange} />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField label="Navn" name="name" required autoComplete="name" placeholder="Dit fulde navn" value={formData.name} onChange={handleChange} />
                      <FormField label="Email" name="email" type="email" required autoComplete="email" placeholder="din@email.dk" value={formData.email} onChange={handleChange} />
                    </div>
                    <FormField label="Besked" name="message" type="textarea" required placeholder="Skriv din besked her..." value={formData.message} onChange={handleChange} />
                  </fieldset>
                  {status === "error" && <p role="alert" className="mt-5! rounded-lg bg-red-50 p-4 text-sm text-red-800!">Beskeden kunne ikke sendes. Dine oplysninger er gemt her i formularen. Prøv igen, eller kontakt os på telefon eller email.</p>}
                  <div className={styles.actions}><button type="submit" disabled={status === "submitting"} className={styles.button}>{status === "submitting" ? "Sender..." : "Send besked"}</button></div>
                </form>
              )}
            </div>
            <aside aria-label="Kontaktoplysninger">
              <div className={styles.panel}><h2>Besøg din butik</h2>
                <div className={styles.rows}>{Object.values(STORES).map((store) => <div key={store.slug}>
                  <h3>{store.name}</h3>
                  <address className="not-italic text-sm leading-7 text-[#626a65]">{store.street}<br />{store.zip} {store.city}</address>
                  <p className="mt-3! text-sm">Mandag–fredag: {store.hours.weekdays}<br />Lørdag: {store.hours.saturday}<br />Søndag: {store.hours.sunday}</p>
                  <a href={`mailto:${store.email}`} className={styles.textLink}>{store.email}</a>
                  <div className={styles.actions}><Link href={`/butik/${store.slug}`} className={styles.textLink}>Se {store.city} →</Link><a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={styles.textLink}>Find vej →</a></div>
                </div>)}</div>
                <p className="mt-5! text-sm">Vi bestræber os på at svare inden for 24 timer på hverdage.</p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
