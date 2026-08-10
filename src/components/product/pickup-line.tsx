import { STORES } from "@/lib/store-config";
import { isStoreId, type StoreId } from "@/lib/stores";

export type PickupLineProps = {
  /** Per-store stock for the currently selected grade/storage/color. */
  stockByStore: { slug: string; count: number }[];
  /** Injectable "now", for deterministic tests. Defaults to the real current instant. */
  now?: Date;
};

type StoreHours = { weekdays: string; saturday: string; sunday: string };

/**
 * "Now is this shop actually open" check for the copy — if the shop is
 * closed at render time, "i dag" would be a promise the customer can't act
 * on for hours, so we drop the same-day wording and just name the store.
 *
 * This is rendered server-side on every ISR regeneration (the PDP route has
 * `revalidate = 60`), and the Vercel Node runtime has no `TZ` set, i.e. its
 * local clock is UTC — two (winter: one) hours behind the Danish wall clock
 * `STORES.*.hours` is written in. Using `Date`'s local getters (`getDay`,
 * `getHours`) here would silently evaluate opening hours in UTC instead of
 * Danish time. So this reads the wall-clock day/hour/minute explicitly in
 * `Europe/Copenhagen` via `Intl.DateTimeFormat`, which does not depend on
 * (and is unaffected by) the runtime's own default time zone.
 */
export function isOpenNow(hours: StoreHours, now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    hourCycle: "h23",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const weekday = get("weekday"); // "Mon" .. "Sun", in Danish local time
  const span = weekday === "Sun" ? hours.sunday : weekday === "Sat" ? hours.saturday : hours.weekdays;
  const [openStr, closeStr] = span.split("–").map((s) => s.trim());
  if (!openStr || !closeStr) return false;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const nowMinutes = Number(get("hour")) * 60 + Number(get("minute"));
  return nowMinutes >= toMinutes(openStr) && nowMinutes < toMinutes(closeStr);
}

type Store = (typeof STORES)[StoreId];

/** "Vejle" / "Vejle og Slagelse" — optionally with the street when it's a single store (no ambiguity about which address). */
function nameClause(list: Store[]): string {
  const names = list.map((s) => s.city).join(" og ");
  return list.length === 1 ? `${names} — ${list[0].street}` : names;
}

/**
 * Local-pickup line shown directly under the buy button. Truthfulness over
 * sales pitch: only names a store that actually holds the unit right now,
 * only says "i dag" for a store that's currently open, and falls back to
 * plain delivery copy when no shop has stock — never implying a pickup
 * option that can't be honoured.
 */
export function PickupLine({ stockByStore, now }: PickupLineProps) {
  const stores = stockByStore
    .filter((s) => s.count > 0 && isStoreId(s.slug))
    .map((s) => STORES[s.slug as StoreId]);

  if (stores.length === 0) {
    return (
      <p className="text-[11px] text-charcoal/45">
        Ikke på lager i butik lige nu — levering 1–2 hverdage.
      </p>
    );
  }

  const openStores = stores.filter((store) => isOpenNow(store.hours, now));
  const closedStores = stores.filter((store) => !isOpenNow(store.hours, now));

  return (
    <p className="text-[11px] text-charcoal/45">
      {openStores.length > 0 && <>Kan hentes i {nameClause(openStores)} i dag. </>}
      {closedStores.length > 0 && (
        <>
          Kan hentes i {nameClause(closedStores)} ved næste åbningstid.{" "}
        </>
      )}
      Ellers levering 1–2 hverdage.
    </p>
  );
}
