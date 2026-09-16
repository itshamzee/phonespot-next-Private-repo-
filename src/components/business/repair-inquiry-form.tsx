"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { COMPANY_EMAIL, STORES } from "@/lib/store-config";
import styles from "./business-repair.module.css";

type Status = "idle" | "submitting" | "success" | "error";

export function RepairInquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const sending = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();

    // Native required validation does not reject whitespace-only text.
    for (const name of ["name", "company", "email", "location", "description"]) {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement;
      field.setCustomValidity(value(name) ? "" : "Udfyld dette felt.");
    }
    if (!form.reportValidity()) return;

    const inJutland = value("region") === "jylland";
    const region = inJutland ? "Jylland" : "Sjælland";
    sending.current = true;
    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value("name"),
          email: value("email"),
          phone: value("phone"),
          subject: "Erhvervsreparation på virksomheden",
          source: "erhvervsreparation",
          store_id: inJutland ? "vejle" : "slagelse",
          message: [
            `Virksomhed: ${value("company")}`,
            `Postnummer og by: ${value("location")}`,
            `Landsdel: ${region}`,
            `Antal enheder: ${value("device_count")}`,
            "",
            "Enheder og problem:",
            value("description"),
          ].join("\n"),
          metadata: {
            company: value("company"),
            location: value("location"),
            region,
            device_count: Number(value("device_count")),
          },
        }),
      });
      if (!response.ok) throw new Error("Inquiry failed");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  if (status === "success") {
    return (
      <div className={styles.success} ref={successRef} tabIndex={-1}>
        <div role="status">
          <h3>Tak for jeres forespørgsel.</h3>
          <p>Vi har modtaget jeres beskrivelse og vender tilbage for at tale om opgaven.</p>
          <p>Besøget er først aftalt, når vi sammen har afklaret omfang, tidspunkt og pris.</p>
        </div>
        <p>Har I noget at tilføje? Ring på <a href={`tel:${STORES.slagelse.phone.replace(/\s/g, "")}`}>{STORES.slagelse.phone}</a>.</p>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      aria-label="Forespørgsel om erhvervsreparation"
      aria-busy={status === "submitting"}
      onSubmit={handleSubmit}
      onInput={(event) => {
        const field = event.target;
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.setCustomValidity("");
      }}
    >
      <p className={styles.formHint}>Felter med * skal udfyldes.</p>
      <fieldset disabled={status === "submitting"} className={styles.fields}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="business-name">Kontaktperson <span aria-hidden="true">*</span></label>
            <input id="business-name" name="name" autoComplete="name" required maxLength={150} />
          </div>
          <div className={styles.field}>
            <label htmlFor="business-company">Virksomhed <span aria-hidden="true">*</span></label>
            <input id="business-company" name="company" autoComplete="organization" required maxLength={200} />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="business-email">E-mail <span aria-hidden="true">*</span></label>
            <input id="business-email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <div className={styles.field}>
            <label htmlFor="business-phone">Telefon <span className={styles.optional}>(valgfrit)</span></label>
            <input id="business-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="business-location">Postnummer og by <span aria-hidden="true">*</span></label>
            <input id="business-location" name="location" placeholder="Fx 4000 Roskilde" required maxLength={200} />
          </div>
          <div className={styles.field}>
            <label htmlFor="business-region">Landsdel <span aria-hidden="true">*</span></label>
            <select id="business-region" name="region" required defaultValue="">
              <option value="" disabled>Vælg landsdel</option>
              <option value="sjaelland">Sjælland</option>
              <option value="jylland">Jylland</option>
            </select>
          </div>
        </div>
        <div className={`${styles.field} ${styles.countField}`}>
          <label htmlFor="business-count">Antal enheder <span aria-hidden="true">*</span></label>
          <input id="business-count" name="device_count" type="number" inputMode="numeric" min={1} step={1} required aria-describedby="business-count-hint" />
          <p id="business-count-hint" className={styles.fieldHint}>Et cirkaantal er fint.</p>
        </div>
        <div className={styles.field}>
          <label htmlFor="business-description">Beskriv enhederne og problemet <span aria-hidden="true">*</span></label>
          <textarea id="business-description" name="description" rows={5} required maxLength={10000} placeholder="Hvilke modeller har I, og hvad skal repareres? Skriv også gerne, hvornår et besøg passer jer." />
        </div>
      </fieldset>
      {status === "error" && (
        <p className={styles.error} role="alert">
          Forespørgslen kunne ikke sendes. Jeres oplysninger står stadig i formularen. Prøv igen, eller skriv til <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
        </p>
      )}
      <div className={styles.formFooter}>
        <p>Det er en uforpligtende forespørgsel. Vi aftaler besøget med jer, før vi kommer.</p>
        <button className={styles.button} type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sender forespørgsel…" : "Send forespørgsel"}
        </button>
        <p className={styles.privacy}>Læs, hvordan vi behandler jeres oplysninger i vores <Link href="/privatlivspolitik">privatlivspolitik</Link>.</p>
      </div>
    </form>
  );
}
