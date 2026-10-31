"use client";

import Link from "next/link";
import { BLACK_NOVEMBER } from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import styles from "./black-november.module.css";

const OFFERS = [
  {
    figure: `${BLACK_NOVEMBER.repairPercent} %`,
    title: "på alle reparationer",
    text: "Skærm, batteri, opladerstik og alt det andet. 15 % ved tre eller flere.",
    href: "/reparation",
  },
  {
    figure: `${BLACK_NOVEMBER.devicePercent} %`,
    title: "på alle brugte enheder",
    text: "iPhones, iPads, bærbare og ure med 36 måneders garanti.",
    href: "/iphones",
  },
  {
    figure: `${BLACK_NOVEMBER.accessoryPriceKr} kr.`,
    title: "for covers og beskyttelsesglas",
    text: "Privacy eller klart glas og alle covers. Bookcovers og lagersalg er ikke med.",
    href: "/tilbehoer/covers",
  },
] as const;

/** Smal sort bjælke øverst på alle sider i november. */
export function BlackNovemberBar({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  return (
    <div className={styles.bar} role="region" aria-label="Black November">
      <div className={styles.barInner}>
        <strong className={styles.name}>Black November</strong>
        <span className={styles.barOffers}>
          <strong>{BLACK_NOVEMBER.repairPercent} %</strong> på reparationer ·{" "}
          <strong>{BLACK_NOVEMBER.devicePercent} %</strong> på brugte enheder · covers og glas{" "}
          <strong>{BLACK_NOVEMBER.accessoryPriceKr} kr.</strong>
        </span>
        <span className={styles.barShort}>Tilbud hele november</span>
        <Link className={styles.barLink} href={BLACK_NOVEMBER.href}>
          Se tilbuddene
        </Link>
      </div>
    </div>
  );
}

/** Det store bånd på forsiden: tre tal som et regnskab, ikke tre ens kort. */
export function BlackNovemberBand({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  return (
    <section className={styles.band} aria-labelledby="black-november-band">
      <div className={styles.bandInner}>
        <div>
          <p className={styles.bandDate}>Til og med 30. november</p>
          <h2 id="black-november-band" className={styles.bandTitle}>
            Black November.
          </h2>
          <p className={styles.bandLead}>
            Hele måneden i butikkerne i Vejle og Slagelse og her på siden. Prisen trækkes automatisk.
          </p>
          <Link className={styles.bandCta} href={BLACK_NOVEMBER.href}>
            Se alle tilbud
          </Link>
        </div>
        <ul className={styles.ledger}>
          {OFFERS.map((o) => (
            <li key={o.href}>
              <Link href={o.href}>
                <span className={styles.figure}>{o.figure}</span>
                <span className={styles.ledgerText}>
                  <strong>{o.title}</strong>
                  <span>{o.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type StripKind = "repair" | "devices" | "accessories";

const STRIP_COPY: Record<StripKind, { lead: string; text: string }> = {
  repair: {
    lead: `${BLACK_NOVEMBER.repairPercent} % på alle reparationer`,
    text: "hele november. Rabatten trækkes, når du booker.",
  },
  devices: {
    lead: `${BLACK_NOVEMBER.devicePercent} % på alle brugte enheder`,
    text: "hele november. Priserne herunder er allerede nedsat.",
  },
  accessories: {
    lead: `Covers og beskyttelsesglas ${BLACK_NOVEMBER.accessoryPriceKr} kr.`,
    text: "hele november. Bookcovers og lagersalg er ikke med.",
  },
};

/** Smal kampagnelinje til kategori- og reparationssider. */
export function BlackNovemberStrip({ kind, serverActive = false }: { kind: StripKind; serverActive?: boolean }) {
  const active = useBlackNovember(serverActive);
  if (!active) return null;
  const copy = STRIP_COPY[kind];
  return (
    <div className={styles.strip} role="note">
      <span>
        <strong className={styles.name}>Black November</strong> {copy.lead} {copy.text}
      </span>
      <Link href={BLACK_NOVEMBER.href}>Alle tilbud</Link>
    </div>
  );
}
