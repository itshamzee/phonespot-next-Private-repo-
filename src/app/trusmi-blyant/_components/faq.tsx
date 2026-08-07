"use client";

import { useState } from "react";
import { STORES } from "@/lib/store-config";

interface QA { q: string; a: string }

const FAQ: ReadonlyArray<QA> = [
  {
    q: "Hvilke iPads er den kompatibel med?",
    a: "Trusmi Smart Pencil understøtter iPad Pro 11\" (3. gen, 2021) — modelnummer A2378 og A2379 — samt iPad Pro 12,9\" (5. gen, 2021) — modelnummer A2461, A2462 og A2437. Tjek modelnummeret bag på din iPad hvis du er i tvivl.",
  },
  {
    q: "Skal jeg parre den via Bluetooth?",
    a: "Nej — Smart Pencil bruger en aktiv kapacitiv spids og fungerer plug-and-play uden parring. Tryk på den fysiske tænd-knap, og du kan skrive med det samme.",
  },
  {
    q: "Hvor lang er batterilevetiden?",
    a: "Cirka 8 timers aktiv brug på en opladning, og hele 360 dages standby. Auto-sleep aktiveres efter 5 minutters inaktivitet for at spare strøm. Fuld opladning tager kun 40 minutter via USB Type-C.",
  },
  {
    q: "Kan jeg afhente den i butikken?",
    a: `Ja — vi har dem på lager i både Slagelse (${STORES.slagelse.street}) og Vejle (${STORES.vejle.street}). Bestil online og hent samme dag, eller kig forbi og prøv den først.`,
  },
  {
    q: "Kan spidsen udskiftes?",
    a: "Ja, POM-spidsen kan udskiftes. Det er praktisk hvis spidsen slides over tid eller hvis du vil have en mere blød skrive-følelse til notater.",
  },
  {
    q: "Følger der garanti med?",
    a: "Ja — 24 måneders fuld returret + reklamationsret efter dansk købelov. Hvis blyanten fejler, ordner vi det uden ekstra omkostninger.",
  },
  {
    q: "Kan jeg betale i rater?",
    a: "Ja — vi tilbyder delbetaling med ViaBill og Klarna ved checkout. Spred 349 kr over 3-12 måneder med fast lav rente.",
  },
];

export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-black/8">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
            >
              <span className="font-display text-lg font-medium text-[#0F2A20] sm:text-xl">
                {item.q}
              </span>
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#0F2A20]/20 transition-transform ${isOpen ? "rotate-45" : ""}`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[#0F2A20]" fill="currentColor">
                  <path d="M7.25 2.75a.75.75 0 0 1 1.5 0v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5Z" />
                </svg>
              </span>
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <p className="pb-6 pr-12 text-base leading-relaxed text-[#3F4A45]">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
