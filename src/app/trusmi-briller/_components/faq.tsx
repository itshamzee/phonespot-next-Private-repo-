"use client";

import { useState } from "react";
import { TRUSTPILOT_SCORE_LABEL_DA } from "@/lib/trustpilot/constants";
import { STORES } from "@/lib/store-config";

interface QA {
  q: string;
  a: string;
}

const FAQ: ReadonlyArray<QA> = [
  {
    q: "Hvilke sprog kan brillerne oversætte?",
    a: "Trusmi-app'en understøtter over 40 sprog inklusive engelsk, tysk, fransk, spansk, italiensk, kinesisk, japansk, arabisk og dansk. Oversættelsen sker i real-time via din telefon — så længe du har internet, har du oversættelse.",
  },
  {
    q: "Skal jeg bruge en app for at de virker?",
    a: "Ja. Trusmi-app'en er gratis og findes til både iOS (10.0+) og Android (9.0+). Brillerne forbinder via Bluetooth 5.3 — enkel setup på under 2 minutter.",
  },
  {
    q: "Hvor lang er batterilevetiden?",
    a: "Op til 8+ timers aktiv brug på en opladning. Standby holder 15 dage. Magnetisk hurtig-opladning bringer dig til 100% på cirka 60 minutter.",
  },
  {
    q: "Kan jeg afhente brillerne i butikken?",
    a: `Ja — vi har dem på lager i både Slagelse (${STORES.slagelse.street}) og Vejle (${STORES.vejle.street}). Bestil online og hent samme dag, eller kig forbi og prøv dem først. Du kan også få fri fragt over 500 kr.`,
  },
  {
    q: "Hvad er forskellen mellem 1.199 kr nyprisen og de 799 kr I tager?",
    a: "1.199 kr er producentens anbefalede udsalgspris. Vi har en lanceringspris på 799 kr — du sparer 400 kr nu. Ingen skjulte gebyrer, ingen abonnement.",
  },
  {
    q: "Følger der garanti med?",
    a: `Ja — 24 måneders fuld returret + reklamationsret efter dansk købelov. Hvis brillerne fejler, ordner vi det uden ekstra omkostninger. Vi er e-mærket-certificerede og har ${TRUSTPILOT_SCORE_LABEL_DA} ★ på Trustpilot.`,
  },
  {
    q: "Kan jeg betale i rater?",
    a: "Ja — vi tilbyder delbetaling med ViaBill og Klarna ved checkout. Spred 799 kr over 3-12 måneder med fast lav rente.",
  },
  {
    q: "Hvor leveres der til, og hvor hurtigt?",
    a: "Vi sender til hele Danmark. GLS leverer typisk på 1-2 hverdage. Bestiller du før kl. 14 på en hverdag, sendes pakken samme dag fra vores lager i Slagelse.",
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
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="pb-6 pr-12 text-base leading-relaxed text-[#3F4A45]">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
