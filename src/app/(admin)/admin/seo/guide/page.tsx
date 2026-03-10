"use client";

import { useState } from "react";

const TABS = [
  { id: "gsc", label: "Google Search Console" },
  { id: "gbp", label: "Google Business Profile" },
  { id: "dns", label: "Email DNS Opsætning" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-eco text-sm font-bold text-white">
        {number}
      </div>
      <div className="flex-1 pb-6">
        <h4 className="mb-2 text-sm font-semibold text-charcoal">{title}</h4>
        <div className="text-sm leading-relaxed text-stone-500">{children}</div>
      </div>
    </div>
  );
}

function GSCGuide() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Opret en GSC Property">
        <p>
          Gå til{" "}
          <span className="font-medium text-charcoal">search.google.com/search-console</span>{" "}
          og log ind med din Google-konto. Klik &quot;Tilføj property&quot; og vælg
          &quot;Domain&quot; type. Indtast <span className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">phonespot.dk</span>.
        </p>
      </Step>

      <Step number={2} title="Verificer ejerskab via DNS">
        <p>Google giver dig en TXT record. Tilføj den til din DNS hos dit domænehosting:</p>
        <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs">
          <p className="text-stone-400">Type: TXT</p>
          <p className="text-stone-400">Name: @</p>
          <p className="text-stone-400">Value: google-site-verification=XXXXXXXXXXXX</p>
        </div>
        <p className="mt-2">Vent 5-10 minutter, gå tilbage til GSC og klik &quot;Verificer&quot;.</p>
      </Step>

      <Step number={3} title="Opret Google Cloud Service Account">
        <ol className="mt-1 list-inside list-decimal space-y-1">
          <li>Gå til <span className="font-medium text-charcoal">console.cloud.google.com</span></li>
          <li>Opret et nyt projekt (fx &quot;PhoneSpot SEO&quot;)</li>
          <li>Aktivér &quot;Google Search Console API&quot; under APIs &amp; Services</li>
          <li>Gå til &quot;Service Accounts&quot; og opret en ny</li>
          <li>Download JSON credentials filen</li>
        </ol>
      </Step>

      <Step number={4} title="Del GSC property med Service Account">
        <p>
          I Google Search Console, gå til Indstillinger → Brugere og tilladelser.
          Tilføj service account emailen (fx{" "}
          <span className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">
            phonespot-seo@project.iam.gserviceaccount.com
          </span>
          ) som bruger med &quot;Fuld&quot; adgang.
        </p>
      </Step>

      <Step number={5} title="Tilføj credentials til PhoneSpot">
        <p>Sæt følgende environment variables i Vercel:</p>
        <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs space-y-1">
          <p><span className="text-green-eco">GSC_CLIENT_EMAIL</span>=service-account@project.iam.gserviceaccount.com</p>
          <p><span className="text-green-eco">GSC_PRIVATE_KEY</span>=-----BEGIN PRIVATE KEY-----\nXXX...</p>
          <p><span className="text-green-eco">GSC_PROPERTY</span>=sc-domain:phonespot.dk</p>
        </div>
      </Step>

      <Step number={6} title="Test forbindelsen">
        <p>
          Gå til <span className="font-medium text-charcoal">/admin/seo</span> og klik &quot;Sync nu&quot;.
          Hvis alt er korrekt, hentes søgeord og sidedata fra GSC. Automatisk daglig sync kører via cron job.
        </p>
      </Step>
    </div>
  );
}

function GBPGuide() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Opret separate profiler per butik">
        <p>
          Gå til <span className="font-medium text-charcoal">business.google.com</span>.
          Opret EN profil per lokation:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li><span className="font-medium">PhoneSpot Slagelse</span> — VestsjællandsCentret 10, 4200 Slagelse</li>
          <li><span className="font-medium">PhoneSpot Vejle</span> — [adresse], 7100 Vejle</li>
        </ul>
      </Step>

      <Step number={2} title="Vælg den rigtige kategori">
        <p>Primær kategori: <span className="font-medium text-charcoal">&quot;Mobiltelefon reparationsbutik&quot;</span></p>
        <p className="mt-1">Sekundære kategorier:</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Butik med brugt elektronik</li>
          <li>Elektronikbutik</li>
        </ul>
      </Step>

      <Step number={3} title="Udfyld ALLE felter">
        <ul className="list-inside list-disc space-y-1">
          <li><span className="font-medium">Åbningstider</span> — dag for dag, inkl. helligdage</li>
          <li><span className="font-medium">Telefon</span> — unikt nummer per lokation</li>
          <li><span className="font-medium">Website</span> — link til den specifikke butikside: phonespot.dk/butik/slagelse</li>
          <li><span className="font-medium">Services</span> — tilføj alle: Skærmreparation, Batteriskift, Opkøb af brugte enheder, etc.</li>
          <li><span className="font-medium">Fotos</span> — ægte fotos fra butikken (min 5-10 billeder)</li>
          <li><span className="font-medium">Beskrivelse</span> — unik per lokation, inkluder bynavn og services</li>
        </ul>
      </Step>

      <Step number={4} title="Ugentlige posts">
        <p>Post 1-2 gange om ugen med:</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Billeder af reparationer I har lavet</li>
          <li>Nye produkter i butikken</li>
          <li>Tilbud eller kampagner</li>
          <li>Tips til telefon-vedligeholdelse</li>
        </ul>
      </Step>

      <Step number={5} title="NAP Konsistens Checklist">
        <p>
          <span className="font-medium">NAP = Name, Address, Phone.</span> Skal være
          100% identisk overalt:
        </p>
        <div className="mt-2 space-y-2">
          {[
            { name: "Google Business Profile", url: "business.google.com" },
            { name: "Trustpilot", url: "trustpilot.com" },
            { name: "Krak", url: "krak.dk" },
            { name: "De Gule Sider", url: "degulesider.dk" },
            { name: "Eniro", url: "eniro.dk" },
            { name: "Facebook", url: "facebook.com" },
            { name: "Apple Maps", url: "mapsconnect.apple.com" },
          ].map((dir) => (
            <div key={dir.name} className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-stone-300" />
              <span className="text-sm font-medium text-charcoal">{dir.name}</span>
              <span className="text-xs text-stone-400">{dir.url}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-amber-600">
          Vigtigt: Selv små variationer (&quot;Vej&quot; vs &quot;vej&quot;, forkortelser) svækker jeres lokale SEO.
        </p>
      </Step>
    </div>
  );
}

function DNSGuide() {
  return (
    <div className="space-y-1">
      <Step number={1} title="SPF Record">
        <p>Tillader Resend at sende email fra phonespot.dk:</p>
        <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs">
          <p className="text-stone-400">Type: TXT</p>
          <p className="text-stone-400">Name: @</p>
          <p className="text-stone-400">Value: v=spf1 include:amazonses.com ~all</p>
        </div>
        <p className="mt-1 text-xs text-stone-400">Resend bruger Amazon SES. Tjek Resend docs for opdateret SPF record.</p>
      </Step>

      <Step number={2} title="DKIM Records">
        <p>Gå til Resend Dashboard → Domains → phonespot.dk. Resend giver dig 3 CNAME records:</p>
        <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs space-y-1">
          <p className="text-stone-400">Type: CNAME</p>
          <p className="text-stone-400">Name: resend._domainkey</p>
          <p className="text-stone-400">Value: [fra Resend dashboard]</p>
        </div>
        <p className="mt-1">Tilføj alle 3 CNAME records til din DNS.</p>
      </Step>

      <Step number={3} title="DMARC Record">
        <p>Beskytter mod email spoofing:</p>
        <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs">
          <p className="text-stone-400">Type: TXT</p>
          <p className="text-stone-400">Name: _dmarc</p>
          <p className="text-stone-400">Value: v=DMARC1; p=quarantine; rua=mailto:info@phonespot.dk</p>
        </div>
      </Step>

      <Step number={4} title="Verificer i Resend">
        <p>
          Gå tilbage til Resend Dashboard → Domains. Klik &quot;Verify DNS Records&quot;.
          Alle records skal vise grønt flueben. Det kan tage op til 48 timer for DNS-ændringer at propagere.
        </p>
      </Step>

      <Step number={5} title="GatewayAPI SMS Opsætning">
        <p>SMS kræver ingen DNS. Opsæt via environment variable:</p>
        <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs">
          <p><span className="text-green-eco">GATEWAY_API_TOKEN</span>=dit-token-fra-gatewayapi.com</p>
        </div>
        <p className="mt-1">
          Hent dit token fra <span className="font-medium text-charcoal">gatewayapi.com</span> → API Keys.
          Afsendernavn er sat til &quot;PhoneSpot&quot; i koden.
        </p>
      </Step>
    </div>
  );
}

export default function SEOGuidePage() {
  const [activeTab, setActiveTab] = useState<Tab>("gsc");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-charcoal">
          Opsætningsguide
        </h2>
        <p className="mt-1 text-sm text-stone-400">
          Trin-for-trin guide til at tilknytte SEO-værktøjer og opsætte email/SMS.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-stone-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-charcoal shadow-sm"
                : "text-stone-400 hover:text-stone-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-stone-200/60 bg-white p-6 shadow-sm">
        {activeTab === "gsc" && <GSCGuide />}
        {activeTab === "gbp" && <GBPGuide />}
        {activeTab === "dns" && <DNSGuide />}
      </div>
    </div>
  );
}
