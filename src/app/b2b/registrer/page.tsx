"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import styles from "./registration.module.css";

type FormState = Record<"companyName" | "cvrNummer" | "contactName" | "email" | "phone" | "password" | "passwordConfirm", string>;
const initialForm: FormState = { companyName: "", cvrNummer: "", contactName: "", email: "", phone: "", password: "", passwordConfirm: "" };

export default function B2BRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || success) feedback.current?.focus(); }, [error, success, attempt]);

  function update(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current || success) return;
    setAttempt(prev => prev + 1);
    setError(null);
    if (!form.companyName.trim() || !form.contactName.trim() || !form.email.trim()) {
      setError("Udfyld firmanavn, kontaktperson og e-mail."); return;
    }
    if (!/^\d{8}$/.test(form.cvrNummer)) {
      setError("CVR-nummeret skal være præcis 8 cifre."); return;
    }
    if (form.password.length < 8) {
      setError("Adgangskoden skal være mindst 8 tegn."); return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Adgangskoderne stemmer ikke overens. Prøv igen."); return;
    }
    if (!e.currentTarget.reportValidity()) return;
    sending.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/b2b/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName.trim(), cvrNummer: form.cvrNummer,
          contactName: form.contactName.trim(), email: form.email.trim(),
          phone: form.phone.trim() || undefined, password: form.password,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) setError(data.error ?? "Ansøgningen kunne ikke sendes. Prøv igen.");
      else {
        setForm(prev => ({ ...prev, password: "", passwordConfirm: "" }));
        setSuccess(true);
      }
    } catch {
      setError("Forbindelsen blev afbrudt. Prøv igen, eller kontakt os, hvis du er i tvivl om, hvorvidt ansøgningen er modtaget.");
    } finally { sending.current = false; setSubmitting(false); }
  }

  function field(name: keyof FormState, label: string, options: { type?: string; autoComplete?: string; placeholder?: string; hint?: string; full?: boolean } = {}) {
    return <div className={options.full ? styles.full : undefined}>
      <label htmlFor={`reg-${name}`}>{label}{name === "phone" && <span> (valgfrit)</span>}</label>
      <input id={`reg-${name}`} name={name} type={options.type ?? "text"} required={name !== "phone"}
        autoComplete={options.autoComplete} placeholder={options.placeholder}
        inputMode={name === "cvrNummer" ? "numeric" : undefined}
        pattern={name === "cvrNummer" ? "\\d{8}" : undefined}
        maxLength={name === "cvrNummer" ? 8 : undefined}
        minLength={options.type === "password" ? 8 : undefined}
        aria-describedby={options.hint ? `${name}-help` : undefined}
        value={form[name]} onChange={e => update(name, name === "cvrNummer" ? e.target.value.replace(/\D/g, "") : e.target.value)} />
      {options.hint && <small id={`${name}-help`}>{options.hint}</small>}
    </div>;
  }

  return <div className={styles.page}><div className={styles.wrap}>
    <nav className={styles.breadcrumb} aria-label="Brødkrummesti">
      <Link href="/">Forside</Link><span aria-hidden="true">/</span><Link href="/b2b">Forhandlere</Link><span aria-hidden="true">/</span><span aria-current="page">Bliv forhandler</span>
    </nav>
    <div className={styles.layout}>
      <section className={styles.intro} aria-labelledby="registration-title">
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>PhoneSpot til forhandlere</p>
          <h1 id="registration-title">Jeres værksted.<br />Vores reservedele.</h1>
          <p className={styles.lead}>Bliv forhandler hos PhoneSpot, og få adgang til engrospriser på reservedele til telefoner og tablets.</p>
          <a href="#ansoegning" className={styles.mobileCta}>Gå til ansøgningen <StorefrontIcon kind="arrow" /></a>
          <ul className={styles.benefits}>
            {["Til reparationsværksteder og forhandlere", "Skærme, batterier og andre reservedele", "Priser ekskl. moms på jeres erhvervskonto"].map(text => <li key={text}><StorefrontIcon kind="check" /><span>{text}</span></li>)}
          </ul>
        </div>
        <figure className={styles.photo}>
          <Image src="/images/store/butik-indvendig.jpg" alt="Inde i PhoneSpots butik i Slagelse" width={1600} height={1200} sizes="(max-width: 760px) 100vw, 520px" priority />
          <figcaption>PhoneSpot · Vejle og Slagelse</figcaption>
        </figure>
        <div className={styles.help}><span>Hjælp til oprettelse og priser</span><a href="mailto:b2b@phonespot.dk">b2b@phonespot.dk <StorefrontIcon kind="arrow" /></a></div>
      </section>
      <section id="ansoegning" className={styles.formPanel} aria-labelledby="application-title">
        {success ? <div className={styles.success} ref={feedback} tabIndex={-1} role="status">
          <StorefrontIcon kind="check" /><p className={styles.eyebrow}>Tak for jeres interesse</p>
          <h2 id="application-title">Ansøgningen er modtaget.</h2>
          <p>Vi gennemgår virksomhedens oplysninger og kontakter jer om godkendelsen. Kontoen er klar til brug, når I har fået besked fra os.</p>
          <a href="mailto:b2b@phonespot.dk">Spørgsmål? Skriv til b2b@phonespot.dk</a>
          <Link href="/reservedele" className={styles.submit}>Se vores reservedele <StorefrontIcon kind="arrow" /></Link>
        </div> : <>
          <div className={styles.formHeading}><p className={styles.eyebrow}>Kom i gang</p><h2 id="application-title">Ansøg om erhvervskonto</h2><p>Udfyld jeres oplysninger. Vi gennemgår ansøgningen, før kontoen bliver godkendt.</p></div>
          <form onSubmit={handleSubmit} aria-label="Ansøgning om erhvervskonto" aria-busy={submitting}>
            <p className={styles.requiredNote}>Alle felter er påkrævede, undtagen telefon.</p>
            <div className={styles.fields}>
              {field("companyName", "Firmanavn", { autoComplete: "organization", placeholder: "Virksomhed ApS" })}
              {field("cvrNummer", "CVR-nummer", { placeholder: "12345678", hint: "8 cifre uden mellemrum" })}
              {field("contactName", "Kontaktperson", { autoComplete: "name", placeholder: "Fornavn og efternavn", full: true })}
              {field("email", "E-mail", { type: "email", autoComplete: "email", placeholder: "kontakt@virksomhed.dk" })}
              {field("phone", "Telefon", { type: "tel", autoComplete: "tel", placeholder: "Telefonnummer" })}
            </div>
            <fieldset className={styles.passwords}><legend>Vælg en adgangskode</legend><div className={styles.fields}>
              {field("password", "Adgangskode", { type: "password", autoComplete: "new-password", hint: "Mindst 8 tegn" })}
              {field("passwordConfirm", "Bekræft adgangskode", { type: "password", autoComplete: "new-password" })}
            </div></fieldset>
            {error && <div className={styles.error} role="alert" tabIndex={-1} ref={feedback}>{error}</div>}
            <button type="submit" disabled={submitting} className={styles.submit}>{submitting ? "Sender ansøgning…" : "Ansøg om erhvervskonto"}<StorefrontIcon kind="arrow" /></button>
            <p className={styles.privacy}>Læs, hvordan vi behandler jeres oplysninger i vores <Link href="/privatlivspolitik">privatlivspolitik</Link>.</p>
            <p className={styles.login}>Har I allerede en konto? <Link href="/b2b/login">Log ind <StorefrontIcon kind="arrow" /></Link></p>
          </form>
        </>}
      </section>
    </div>
    <section className={styles.repair} aria-labelledby="business-repair-title">
      <div className={styles.repairTitle}><StorefrontIcon kind="repair" /><div><p className={styles.eyebrow}>Reparation til erhverv</p><h2 id="business-repair-title">Skal vi reparere jeres enheder?</h2></div></div>
      <p>Ved flere enheder kører vi ud til virksomheder på hele Sjælland og i hele Jylland. Fortæl os om opgaven, så aftaler vi det praktiske.</p>
      <Link href="/erhverv">Se erhvervsreparation <StorefrontIcon kind="arrow" /></Link>
    </section>
  </div></div>;
}
