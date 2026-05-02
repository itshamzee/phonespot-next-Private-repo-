/**
 * store-status.ts
 *
 * Server-side helper that composes static store config (src/lib/store-config.ts)
 * with live data from the `store_status` table.
 *
 * Implements a 4-hour staleness rule. Per-slug caching via unstable_cache.
 * Gracefully degrades to static-only data if Supabase is unavailable.
 */

import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase/client';
import { STORES } from '@/lib/store-config';
import type { StoreStatus } from '@/lib/supabase/platform-types';

// ---------------------------------------------------------------------------
// Public type contract
// ---------------------------------------------------------------------------

export type StoreSlug = 'vejle' | 'slagelse';

export type ComposedStoreStatus = {
  slug: StoreSlug;
  name: string;
  city: string;
  street: string;
  mall: string | null;
  zip: string;
  /** Composed: "{mall}, {street}, {zip} {city}" when mall is present, else "{street}, {zip} {city}" */
  fullAddress: string;
  phone: string;
  /** Raw hours string for today, e.g. "10:00 – 17:30", or null if store not in config */
  hoursToday: string | null;
  hoursLabel: 'weekdays' | 'saturday' | 'sunday';
  /** True iff current time falls within hoursToday (inclusive bounds) */
  isOpen: boolean;
  waitMinutes: number | null;
  technicianCount: number | null;
  /** True when live data is older than 4 hours OR no DB row exists */
  isStale: boolean;
  dataUpdatedAt: string | null;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

/**
 * Classifies the current day-of-week into one of the three hours keys.
 * JS getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday.
 */
function classifyDay(date: Date): 'weekdays' | 'saturday' | 'sunday' {
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekdays';
}

/**
 * Parses an hours string like "10:00 – 17:30" (em-dash U+2013 with spaces)
 * into { startMinutes, endMinutes } since midnight.
 *
 * Returns null if the string cannot be parsed — caller treats as closed.
 */
function parseHours(raw: string): { startMinutes: number; endMinutes: number } | null {
  // Split on em-dash (U+2013) surrounded by spaces
  const parts = raw.split('–');
  if (parts.length !== 2) return null;

  const startStr = parts[0].trim();
  const endStr = parts[1].trim();

  const toMinutes = (hhmm: string): number | null => {
    const [hh, mm] = hhmm.split(':');
    const h = parseInt(hh, 10);
    const m = parseInt(mm, 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const startMinutes = toMinutes(startStr);
  const endMinutes = toMinutes(endStr);

  if (startMinutes === null || endMinutes === null) return null;

  return { startMinutes, endMinutes };
}

/**
 * Returns true if the given date falls within the parsed hours (inclusive).
 */
function checkIsOpen(hoursRaw: string | null, now: Date): boolean {
  if (!hoursRaw) return false;

  const parsed = parseHours(hoursRaw);
  if (!parsed) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= parsed.startMinutes && currentMinutes <= parsed.endMinutes;
}

/**
 * Returns true if dataUpdatedAt is older than 4 hours or is null.
 */
function checkIsStale(dataUpdatedAt: string | null): boolean {
  if (!dataUpdatedAt) return true;
  const updatedMs = new Date(dataUpdatedAt).getTime();
  if (isNaN(updatedMs)) return true;
  return Date.now() - updatedMs > STALE_THRESHOLD_MS;
}

// ---------------------------------------------------------------------------
// Core fetch logic (uncached, exported for testing)
// ---------------------------------------------------------------------------

export async function _getStoreStatusUncached(slug: StoreSlug): Promise<ComposedStoreStatus> {
  const config = STORES[slug];

  // Build the static base — always succeeds
  const now = new Date();
  const hoursLabel = classifyDay(now);
  const hoursToday = config?.hours?.[hoursLabel] ?? null;
  const isOpen = checkIsOpen(hoursToday, now);

  const fullAddress = config?.mall
    ? `${config.mall}, ${config.street}, ${config.zip} ${config.city}`
    : `${config.street}, ${config.zip} ${config.city}`;

  // Live data defaults (stale/null until we get a DB row)
  let waitMinutes: number | null = null;
  let technicianCount: number | null = null;
  let isStale = true;
  let dataUpdatedAt: string | null = null;

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('store_status')
      .select('slug, current_wait_minutes, current_technician_count, data_updated_at')
      .eq('slug', slug)
      .maybeSingle() as { data: StoreStatus | null; error: unknown };

    if (data) {
      waitMinutes = data.current_wait_minutes;
      technicianCount = data.current_technician_count;
      dataUpdatedAt = data.data_updated_at;
      isStale = checkIsStale(data.data_updated_at);
    }
    // If data is null, defaults remain: isStale=true, nulls
  } catch {
    // Supabase unavailable — return static config with stale flag
    // (all live fields remain null, isStale remains true)
  }

  return {
    slug,
    name: config.name,
    city: config.city,
    street: config.street,
    mall: config.mall,
    zip: config.zip,
    fullAddress,
    phone: config.phone,
    hoursToday,
    hoursLabel,
    isOpen,
    waitMinutes,
    technicianCount,
    isStale,
    dataUpdatedAt,
  };
}

// ---------------------------------------------------------------------------
// Per-slug cache wrappers (created at module level, not inside the function)
// ---------------------------------------------------------------------------

const _getCachedVejle = unstable_cache(
  () => _getStoreStatusUncached('vejle'),
  ['store-status-vejle-v1'],
  { revalidate: 60, tags: ['store-status-vejle'] },
);

const _getCachedSlagelse = unstable_cache(
  () => _getStoreStatusUncached('slagelse'),
  ['store-status-slagelse-v1'],
  { revalidate: 60, tags: ['store-status-slagelse'] },
);

/**
 * Public entry point — returns the cache-wrapped ComposedStoreStatus for the given slug.
 */
export async function getStoreStatus(slug: StoreSlug): Promise<ComposedStoreStatus> {
  if (slug === 'vejle') return _getCachedVejle();
  return _getCachedSlagelse();
}
