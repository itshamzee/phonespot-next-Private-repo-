"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { COMPANY_EMAIL, STORES } from "@/lib/store-config";
import { getAttribution, trackLead } from "@/lib/tracking/events";
import { CATEGORIES, type ApplianceCategoryId } from "./data";
import s from "./appliances.module.css";

const SELECT_EVENT = "appliance-quote-select";
const OTHER = "andet";

type Status = "idle" | "submitting" | "success" | "error";
type ErrorKey = "appliance" | "problem" | "name" | "phone";
type Errors = Partial<Record<ErrorKey, string>>;

/** Anker til formularen, der også forvælger apparatkategori. Virker uden JS som almindeligt #tilbud-link. */
export function QuoteLink({
  category,
  className,
  children,
}: {
  category?: ApplianceCategoryId;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href="#tilbud"
      className={className}
      onClick={() => {
        if (category) window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: category }));
      }}
    >
      {children}
    </a>
  );
}

function applianceName(value: string) {
  return CATEGORIES.find((c) => c.id === value)?.alt ?? "Andet apparat";
}

export function QuoteForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [appliance, setAppliance] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const sending = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (CATEGORIES.some((c) => c.id === id)) setAppliance(id);
    };
    window.addEventListener(SELECT_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_EVENT, onSelect);
  }, []);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();

    const found: Errors = {};
    if (!appliance) found.appliance = "Vælg, hvilket apparat det drejer sig om.";
    if (!value("problem")) found.problem = "Fortæl kort, hvad der er galt.";
    if (!value("name")) found.name = "Skriv dit navn.";
    if (value("phone").replace(/\D/g, "").length < 8) found.phone = "Skriv et telefonnummer, vi kan ringe til.";
    setErrors(found);
    const first = (["appliance", "problem", "name", "phone"] as const).find((k) => found[k]);
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    // Spam-honeypot: et skjult felt, som kun robotter udfylder. Lad som om det lykkedes.
    if (value("website")) {
      setStatus("success");
      return;
    }

    const storeChoice = value("store");
    const storeId = storeChoice === "vejle" || storeChoice === "slagelse" ? storeChoice : "";
    const storeLabel = storeId === "vejle" ? "Vejle" : storeId === "slagelse" ? "Slagelse" : "Ved ikke";
    const applianceLabel = applianceName(appliance);
    const brandModel = value("brand_model");

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
          subject: `Reparation af apparat: ${applianceLabel}${brandModel ? `, ${brandModel}` : ""}`,
          source: "apparat-reparation",
          store_id: storeId,
          message: [
            `Apparat: ${applianceLabel}`,
            `Mærke og model: ${brandModel || "ikke oplyst"}`,
            `Butik: ${storeLabel}`,
            "",
            "Hvad er galt:",
            value("problem"),
          ].join("\n"),
          metadata: {
            appliance: applianceLabel,
            brand_model: brandModel,
            store_choice: storeLabel,
            attribution: getAttribution(),
          },
        }),
      });
      if (!response.ok) throw new Error("Inquiry failed");
      trackLead({
        leadType: "appliance_repair",
        store: storeId || "webshop",
        category: appliance,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  const fieldError = (key: ErrorKey) =>
    errors[key] ? (
      <p className={s.fieldError} id={`tilbud-${key}-fejl`}>
        {errors[key]}
      </p>
    ) : null;
  const invalid = (key: ErrorKey) =>
    errors[key] ? { "aria-invalid": true, "aria-describedby": `tilbud-${key}-fejl` } : {};

  return (
    <div aria-live="polite">
      {status === "success" ? (
        <div className={s.success} ref={successRef} tabIndex={-1}>
          <h3>Tak, vi har modtaget din henvendelse.</h3>
          <p>
            Vi vender tilbage med en fast pris. Har du brug for et svar hurtigt, kan du ringe til{" "}
            {STORES.vejle.phone}.
          </p>
        </div>
      ) : (
        <form
          className={s.form}
          onSubmit={handleSubmit}
          noValidate
          aria-busy={status === "submitting"}
          aria-label="Få en fast pris"
        >
          <p className={s.formHint}>Felter med * skal udfyldes.</p>
          <fieldset disabled={status === "submitting"} className={s.fields}>
            <div className={s.field}>
              <label htmlFor="tilbud-appliance">Apparat *</label>
              <select
                id="tilbud-appliance"
                name="appliance"
                value={appliance}
                onChange={(e) => setAppliance(e.target.value)}
                {...invalid("appliance")}
              >
                <option value="" disabled>
                  Vælg apparat
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={OTHER}>Andet</option>
              </select>
              {fieldError("appliance")}
            </div>
            <div className={s.field}>
              <label htmlFor="tilbud-brand">Mærke og model</label>
              <input id="tilbud-brand" name="brand_model" maxLength={150} placeholder="Fx Dyson V8" />
            </div>
            <div className={`${s.field} ${s.wide}`}>
              <label htmlFor="tilbud-problem">Hvad er galt? *</label>
              <textarea id="tilbud-problem" name="problem" rows={4} maxLength={5000} {...invalid("problem")} />
              {fieldError("problem")}
            </div>
            <div className={s.field}>
              <label htmlFor="tilbud-store">Butik</label>
              <select id="tilbud-store" name="store" defaultValue="ved-ikke">
                <option value="vejle">Vejle</option>
                <option value="slagelse">Slagelse</option>
                <option value="ved-ikke">Ved ikke</option>
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="tilbud-name">Navn *</label>
              <input id="tilbud-name" name="name" autoComplete="name" maxLength={150} {...invalid("name")} />
              {fieldError("name")}
            </div>
            <div className={s.field}>
              <label htmlFor="tilbud-phone">Telefon *</label>
              <input id="tilbud-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} {...invalid("phone")} />
              {fieldError("phone")}
            </div>
            <div className={s.field}>
              <label htmlFor="tilbud-email">E-mail (valgfri)</label>
              <input id="tilbud-email" name="email" type="email" autoComplete="email" maxLength={254} />
            </div>
            <div className={s.honey} aria-hidden="true">
              <label htmlFor="tilbud-website">Lad dette felt være tomt</label>
              <input id="tilbud-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
          </fieldset>
          {status === "error" && (
            <p className={s.formError} role="alert">
              Henvendelsen kunne ikke sendes. Dine oplysninger står stadig i formularen. Prøv igen, ring til{" "}
              {STORES.vejle.phone} eller skriv til <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
            </p>
          )}
          <div className={s.formFooter}>
            <button className={s.submit} type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Sender" : "Få en fast pris"}
            </button>
            <p>Vi vender tilbage med en fast pris.</p>
          </div>
        </form>
      )}
    </div>
  );
}
