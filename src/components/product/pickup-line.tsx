import { STORES } from "@/lib/store-config";
import { isStoreId, type StoreId } from "@/lib/stores";

export type PickupLineProps = {
  /** Per-store stock for the currently selected grade/storage/color. */
  stockByStore: { slug: string; count: number }[];
};

/**
 * "Now is this shop actually open" check for the copy — if the shop is
 * closed at render time, "i dag" would be a promise the customer can't act
 * on for hours, so we drop the same-day wording and just name the store.
 * `weekdays` covers Mon–Fri; Sat/Sun windows differ but are usually a
 * subset of the weekday window, so treating them the same errs conservative
 * — we may under-claim "i dag" on a weekend open hour, never over-claim it.
 */
function isOpenNow(hours: { weekdays: string; saturday: string; sunday: string }): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday .. 6 = Saturday
  const span = day === 0 ? hours.sunday : day === 6 ? hours.saturday : hours.weekdays;
  const [openStr, closeStr] = span.split("–").map((s) => s.trim());
  if (!openStr || !closeStr) return false;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
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
export function PickupLine({ stockByStore }: PickupLineProps) {
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

  const openStores = stores.filter((store) => isOpenNow(store.hours));
  const closedStores = stores.filter((store) => !isOpenNow(store.hours));

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
