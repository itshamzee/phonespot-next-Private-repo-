import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/cache before importing the module under test
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock the Supabase server client
vi.mock('@/lib/supabase/client', () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from '@/lib/supabase/client';
import { _getStoreStatusUncached } from '../store-status';

// ---------------------------------------------------------------------------
// Helpers to build minimal chainable Supabase query-builder mocks
//
// Chain: .from('store_status') → .select(...) → .eq(...) → .maybeSingle()
// ---------------------------------------------------------------------------

function makeStoreStatusMock<T>(result: { data: T | null; error: null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, maybeSingle };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Test 1: returns fresh data when updated within 4 hours
// ---------------------------------------------------------------------------
describe('_getStoreStatusUncached', () => {
  it('returns fresh data when updated within 4 hours', async () => {
    const row = {
      slug: 'vejle',
      current_wait_minutes: 25,
      current_technician_count: 3,
      data_updated_at: hoursAgo(1),
    };

    const mock = makeStoreStatusMock({ data: row, error: null });
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mock.select }),
    });

    const result = await _getStoreStatusUncached('vejle');

    expect(result.waitMinutes).toBe(25);
    expect(result.technicianCount).toBe(3);
    expect(result.isStale).toBe(false);
    expect(result.dataUpdatedAt).toBe(row.data_updated_at);
  });

  // -------------------------------------------------------------------------
  // Test 2: marks data as stale when older than 4 hours
  // -------------------------------------------------------------------------
  it('marks data as stale when older than 4 hours, but still surfaces the value', async () => {
    const row = {
      slug: 'slagelse',
      current_wait_minutes: 10,
      current_technician_count: 2,
      data_updated_at: hoursAgo(5),
    };

    const mock = makeStoreStatusMock({ data: row, error: null });
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mock.select }),
    });

    const result = await _getStoreStatusUncached('slagelse');

    expect(result.isStale).toBe(true);
    // Value is still surfaced — UI decides whether to display or replace
    expect(result.waitMinutes).toBe(10);
    expect(result.technicianCount).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Test 3: returns null wait/tech when DB row is missing
  // -------------------------------------------------------------------------
  it('returns null wait/tech and isStale:true when DB row is missing', async () => {
    const mock = makeStoreStatusMock({ data: null, error: null });
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mock.select }),
    });

    const result = await _getStoreStatusUncached('vejle');

    expect(result.waitMinutes).toBeNull();
    expect(result.technicianCount).toBeNull();
    expect(result.isStale).toBe(true);
    expect(result.dataUpdatedAt).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 4: returns static config even when Supabase query throws
  // -------------------------------------------------------------------------
  it('returns the static config even when Supabase query throws', async () => {
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        throw new Error('DB connection failed');
      }),
    });

    const result = await _getStoreStatusUncached('vejle');

    // Static fields from STORES config
    expect(result.slug).toBe('vejle');
    expect(result.phone).toBe('+45 61 10 00 48');
    expect(result.street).toBe('Løversysselvej 3A');
    expect(result.city).toBe('Vejle');

    // Live fields are null, data is stale
    expect(result.isStale).toBe(true);
    expect(result.waitMinutes).toBeNull();
    expect(result.technicianCount).toBeNull();
    expect(result.dataUpdatedAt).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 5: computes isOpen correctly during weekday hours (Vejle)
  // -------------------------------------------------------------------------
  it('computes isOpen as true during weekday hours (Tuesday 14:00, Vejle)', async () => {
    // Tuesday 2026-05-05 14:00 local time
    // Vejle weekdays: "10:00 – 17:30" → should be open
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T14:00:00'));

    const mock = makeStoreStatusMock({ data: null, error: null });
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mock.select }),
    });

    const result = await _getStoreStatusUncached('vejle');

    expect(result.isOpen).toBe(true);
    expect(result.hoursLabel).toBe('weekdays');
    expect(result.hoursToday).toBe('10:00 – 17:30');
  });

  // -------------------------------------------------------------------------
  // Test 6: computes isOpen as false outside hours (Tuesday 22:00, Vejle)
  // -------------------------------------------------------------------------
  it('computes isOpen as false outside hours (Tuesday 22:00, Vejle)', async () => {
    // Tuesday 2026-05-05 22:00 — Vejle closes at 17:30
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T22:00:00'));

    const mock = makeStoreStatusMock({ data: null, error: null });
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mock.select }),
    });

    const result = await _getStoreStatusUncached('vejle');

    expect(result.isOpen).toBe(false);
    expect(result.hoursLabel).toBe('weekdays');
  });
});
