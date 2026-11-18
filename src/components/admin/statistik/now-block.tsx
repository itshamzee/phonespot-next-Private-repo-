"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { NowBlock as NowData } from "@/lib/admin/statistik/payload";
import { CountUp } from "./count-up";
import { Delta } from "./delta";
import { clock, kr, pct } from "./format";
import { cardClass } from "./styles";

/**
 * "Lige nu": dagens omsætning med timesøjler og fordeling, og i går, ugen og
 * måneden. Henter sig selv igen hvert minut (ikke mens fanen er skjult); ved fejl
 * bliver de sidste tal stående med "Kunne ikke opdatere".
 */

const POLL_MS = 60_000;
const HOUR_LABELS = ["9", "11", "13", "15", "17", "19"];
const STREAMS = [
  { key: "webshop", label: "Webshop" },
  { key: "kasse", label: "Kassesalg" },
  { key: "reparation", label: "Reparation" },
] as const;

export function NowBlock({ initial, isOwner, butik }: { initial: NowData; isOwner: boolean; butik: string }) {
  const [data, setData] = useState(initial);
  const [source, setSource] = useState(initial);
  const [failed, setFailed] = useState(false);

  // Ny server-render (fx anden butik): start forfra med de nye tal.
  if (source !== initial) {
    setSource(initial);
    setData(initial);
    setFailed(false);
  }

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/admin/statistik/now?butik=${encodeURIComponent(butik)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as NowData;
        if (!cancelled) {
          setData(next);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [butik]);

  const { today } = data;
  const max = Math.max(1, ...today.hours.map((h) => h.revenue));
  const current = today.hours.reduce((last, h, i) => (h.future ? last : i), -1);

  return (
    <div className="grid grid-cols-1 gap-6 min-[980px]:grid-cols-[1.25fr_1fr]">
      <section aria-label="Omsætning i dag" className={cardClass}>
        <div className="flex flex-wrap justify-between gap-2.5">
          <span className="text-[#5E6A63]">Omsætning i dag, uden moms</span>
          <span className="inline-flex items-center gap-[7px] text-[13px] text-[#5E6A63]">
            <span aria-hidden className="stat-pulse h-2 w-2 rounded-full bg-[#5A8C6F]" />
            Opdateret kl. {clock(data.updatedAt)}
            {failed ? <span className="text-[#B42318]">Kunne ikke opdatere</span> : null}
          </span>
        </div>
        <div aria-hidden className="mt-2.5 text-[42px] font-bold leading-[1.05] tracking-[-0.03em] tabular-nums min-[980px]:text-[56px]">
          <CountUp value={today.revenue} />
        </div>
        <span className="sr-only" aria-live="polite">
          Omsætning i dag {kr(today.revenue)}
        </span>
        <div className="mt-1 text-[13px] text-[#5E6A63] tabular-nums">Inkl. moms {kr(today.revenueInclVat)}</div>
        <div className="mt-2">
          <Delta value={today.deltaPct} /> <span className="text-[#5E6A63]">mod i går på samme tidspunkt</span>
        </div>

        <div className="mt-[18px] flex flex-wrap gap-7 border-t border-[#EEF0EC] pt-[18px]">
          {isOwner && today.profit !== undefined ? (
            <>
              <Figure label="Fortjeneste i dag">
                <CountUp value={today.profit} />
              </Figure>
              <Figure label="Margin">
                {today.marginPct == null ? "–" : <CountUp value={today.marginPct} format="pct" />}
              </Figure>
            </>
          ) : null}
          <Figure label="Ordrer og sager">
            <CountUp value={today.count} format="int" />
          </Figure>
        </div>

        <div aria-hidden className="mt-[26px] flex h-[72px] items-end gap-1.5">
          {today.hours.map((h, i) => (
            <div
              key={h.label}
              title={`kl. ${h.label}`}
              className={`min-h-[3px] flex-1 rounded-t-[3px] ${
                h.future ? "bg-[#EEF0EC]" : `stat-grow-y ${i === current ? "bg-[#1A3D2E]" : "bg-[#B9CFC0]"}`
              }`}
              style={{
                height: h.future ? "4%" : `${(Math.max(0, h.revenue) / max) * 100}%`,
                animationDelay: `${i * 40}ms`,
              }}
            />
          ))}
        </div>
        <div aria-hidden className="mt-1.5 flex justify-between text-[12px] text-[#5E6A63]">
          {HOUR_LABELS.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>

        <div className="mt-[22px] flex flex-wrap gap-7 text-[14px]">
          {STREAMS.map((s) => (
            <span key={s.key}>
              <span className="text-[#5E6A63]">{s.label}</span>
              <b className="block text-[17px] tabular-nums">{kr(today.streams[s.key])}</b>
            </span>
          ))}
        </div>
      </section>

      <section aria-label="I går, denne uge og denne måned" className={cardClass} style={{ animationDelay: "60ms" }}>
        {data.rows.map((r, i) => (
          <div
            key={r.key}
            className={`flex items-center justify-between gap-4 ${i === 0 ? "pt-0.5" : "border-t border-[#EEF0EC] pt-5"} ${
              i === data.rows.length - 1 ? "pb-0.5" : "pb-5"
            }`}
          >
            <span>
              <b>{r.label}</b>
              <br />
              <span className="text-[13px] text-[#5E6A63]">
                <Delta value={r.deltaPct} /> {r.compareLabel}
              </span>
            </span>
            <span className="text-right text-[24px] font-bold tabular-nums">
              <CountUp value={r.money.revenue} />
              {isOwner && r.money.profit !== undefined ? (
                <small className="block text-[13px] font-medium text-[#5E6A63]">
                  Fortjeneste {kr(r.money.profit)} · {pct(r.money.marginPct)}
                </small>
              ) : null}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span>
      <span className="text-[#5E6A63]">{label}</span>
      <b className="block text-[22px] tabular-nums">{children}</b>
    </span>
  );
}
