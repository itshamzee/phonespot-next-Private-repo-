"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./model-sections.module.css";

export type FinderStore = {
  slug: string;
  name: string;
  city: string;
  street: string;
  zip: string;
  mall: string | null;
  phone: string;
  href: string;
  mapsUrl: string;
  hours: { weekdays: string; saturday: string; sunday: string };
  coordinates: { lat: number; lng: number };
};

export type FinderUpcomingStore = {
  slug: string;
  city: string;
  mall: string | null;
  opens: string;
};

/** Minutter siden midnat og ugedag (0 = søndag) i dansk tid, uanset kundens tidszone. */
function copenhagenNow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toMinutes(time: string) {
  const [h, m] = time.trim().replace(".", ":").split(":").map(Number);
  return h * 60 + (m || 0);
}

/** "Åbent til 17.30" / "Åbner kl. 10.00" ud fra butikkens faste åbningstider. */
export function openStatus(hours: FinderStore["hours"], date: Date): { open: boolean; label: string } {
  const { day, minutes } = copenhagenNow(date);
  const span = day === 0 ? hours.sunday : day === 6 ? hours.saturday : hours.weekdays;
  const [opens, closes] = span.split("–").map((t) => t.trim());
  if (!opens || !closes) return { open: false, label: "Se åbningstider" };
  const dot = (t: string) => t.replace(":", ".");
  if (minutes >= toMinutes(opens) && minutes < toMinutes(closes)) {
    return { open: true, label: "Åbent nu til " + dot(closes) };
  }
  if (minutes < toMinutes(opens)) return { open: false, label: "Åbner i dag kl. " + dot(opens) };
  const tomorrow = (day + 1) % 7;
  const next = tomorrow === 0 ? hours.sunday : tomorrow === 6 ? hours.saturday : hours.weekdays;
  return { open: false, label: "Lukket · åbner i morgen kl. " + dot(next.split("–")[0].trim()) };
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Butikkerne som rækker med åbent-nu, rute og telefon. Listen bygges af
 * STORES, så nye butikker kommer med af sig selv. Placering spørges der kun om,
 * når kunden selv beder om det; indtil da står butikkerne i fast rækkefølge.
 */
export function RepairStoreFinder({
  modelName,
  stores,
  upcoming,
}: {
  modelName: string;
  stores: FinderStore[];
  upcoming: FinderUpcomingStore[];
}) {
  // Åbent-nu beregnes først i browseren: siden caches i en time, så en
  // server-beregnet status ville være forældet.
  const [now, setNow] = useState<Date | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied">("idle");

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocating("denied");
      return;
    }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating("idle");
      },
      () => setLocating("denied"),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const sorted = position
    ? [...stores]
        .map((s) => ({ store: s, km: distanceKm(position, s.coordinates) }))
        .sort((a, b) => a.km - b.km)
    : stores.map((s) => ({ store: s, km: null as number | null }));

  return (
    <section className={styles.storeFinder} aria-labelledby="naermeste-butik">
      <div>
        <h2 id="naermeste-butik">Find din nærmeste butik</h2>
        <p>
          Kom forbi med din {modelName} uden tidsbestilling. Fejlsøgning ved
          disken er gratis, og mange reparationer klarer vi, mens du venter.
          Er du i tvivl om fejlen, så <Link href="/kontakt">kontakt os</Link>.
        </p>
        <button
          type="button"
          className={styles.locateButton}
          onClick={locate}
          disabled={locating === "busy"}
        >
          {locating === "busy"
            ? "Finder din placering …"
            : position
              ? "Sorteret efter afstand"
              : "Vis nærmeste butik først"}
        </button>
        {locating === "denied" && (
          <p className={styles.hint} role="status">
            Vi kunne ikke se din placering. Butikkerne står i fast rækkefølge.
          </p>
        )}
      </div>
      <ul className={styles.storeRows}>
        {sorted.map(({ store, km }, index) => {
          const status = now ? openStatus(store.hours, now) : null;
          return (
            <li key={store.slug}>
              <div className={styles.storeRowMain}>
                <Link href={store.href}>
                  <strong>{store.city}</strong>
                  {position && index === 0 && <em>Nærmest</em>}
                </Link>
                <span>
                  {store.mall && !store.street.includes(store.mall) ? store.mall + ", " : ""}
                  {store.street}, {store.zip} {store.city}
                  {km != null && " · ca. " + Math.round(km) + " km"}
                </span>
                <span className={styles.storeStatus} data-open={status?.open ?? undefined}>
                  {status
                    ? status.label
                    : "Hverdage " + store.hours.weekdays.replace(/:/g, ".")}
                </span>
              </div>
              <div className={styles.storeRowActions}>
                <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer">
                  Rutevejledning
                </a>
                <a href={"tel:" + store.phone.replace(/\s+/g, "")}>Ring</a>
              </div>
            </li>
          );
        })}
        <li className={styles.storeRowMailIn}>
          <div className={styles.storeRowMain}>
            <Link href="/reparation/indsend">
              <strong>Send den ind</strong>
            </Link>
            <span>
              Bor du langt fra en butik, får du en gratis fragtlabel og
              sender din {modelName} til os fra en pakkeshop.
            </span>
          </div>
          <div className={styles.storeRowActions}>
            <Link href="/reparation/indsend">Sådan gør du</Link>
          </div>
        </li>
        {upcoming.map((store) => (
          <li key={store.slug} className={styles.storeRowUpcoming}>
            <div className={styles.storeRowMain}>
              <Link href={"/butik/" + store.slug}>
                <strong>{store.city}</strong>
              </Link>
              <span>
                {store.mall ? store.mall + " · " : ""}Åbner {store.opens}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
