import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/cache before importing the module under test
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock the Supabase server client
vi.mock('@/lib/supabase/client', () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from '@/lib/supabase/client';
import { _getFeaturedProductUncached } from '../featured-product';

// ---------------------------------------------------------------------------
// Helpers to build minimal chainable Supabase query-builder mocks
// ---------------------------------------------------------------------------

type MockQueryResult<T> = { data: T | null; error: null };

/**
 * Builds a chainable Supabase mock that ends in `.maybeSingle()` returning
 * `{ data, error: null }`.
 *
 * Chain: .from() → .select() → .not() → .or() → .or() → .order() → .limit() → .maybeSingle()
 */
function makeTemplateMock<T>(result: MockQueryResult<T>) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const or2 = vi.fn().mockReturnValue({ order });
  const or1 = vi.fn().mockReturnValue({ or: or2 });
  const not = vi.fn().mockReturnValue({ or: or1 });
  const select = vi.fn().mockReturnValue({ not });
  return { select, not, or1, or2, order, limit, maybeSingle };
}

/**
 * Builds a chainable mock ending in `.select()` returning `{ data, error: null }`.
 *
 * Chain: .from() → .select() → .eq() → .eq() → .in()  (returns data directly)
 */
function makeDevicesMock<T>(result: MockQueryResult<T>) {
  const inFilter = vi.fn().mockResolvedValue(result);
  const eq2 = vi.fn().mockReturnValue({ in: inFilter });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { select, eq1, eq2, inFilter };
}

/**
 * Builds a chainable mock for the fallback query (no .not() step).
 *
 * Chain: .from() → .select() → .eq() → .ilike() → .order() → .limit() → .maybeSingle()
 */
function makeFallbackTemplateMock<T>(result: MockQueryResult<T>) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const ilike = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ ilike });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, ilike, order, limit, maybeSingle };
}

// A minimal fake ProductTemplate
const fakeTemplate = {
  id: 'tmpl-1',
  slug: 'apple-iphone-15-pro',
  display_name: 'iPhone 15 Pro',
  brand: 'Apple',
  images: ['https://cdn.example.com/iphone15pro.jpg'],
  default_attributes: { original_price: 12000 },
  featured_priority: 1,
  featured_starts_at: null,
  featured_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Minimal fake devices (selling_price in øre)
const fakeDevices = [
  { id: 'd1', grade: 'A' as const, selling_price: 699900, status: 'listed', template_id: 'tmpl-1', storage: '256GB', color: 'Black Titanium' },
  { id: 'd2', grade: 'B' as const, selling_price: 599900, status: 'listed', template_id: 'tmpl-1', storage: '128GB', color: 'Black Titanium' },
  { id: 'd3', grade: 'A' as const, selling_price: 749900, status: 'listed', template_id: 'tmpl-1', storage: '512GB', color: 'White Titanium' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test 1: returns the highest-priority active featured template
// ---------------------------------------------------------------------------
describe('getFeaturedProduct', () => {
  it('returns the highest-priority active featured template with derived price + stock', async () => {
    const templateMock = makeTemplateMock({ data: fakeTemplate, error: null });
    const devicesMock = makeDevicesMock({ data: fakeDevices, error: null });

    let callCount = 0;
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'product_templates') return templateMock.select;
        if (table === 'devices') return devicesMock.select;
        return {};
      }),
    });

    // Patch .from() to be a direct function, not relying on select() indirection
    // Instead, use a simpler approach: track .from() calls by order
    const fromFn = vi.fn((table: string) => {
      if (table === 'product_templates') {
        // Return the chain starting at select
        return { select: templateMock.select };
      }
      if (table === 'devices') {
        return { select: devicesMock.select };
      }
      return {};
    });

    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await _getFeaturedProductUncached();

    expect(result).not.toBeNull();
    expect(result!.template.slug).toBe('apple-iphone-15-pro');
    expect(result!.template.displayName).toBe('iPhone 15 Pro');
    expect(result!.template.brand).toBe('Apple');
    // fromPrice should be the lowest selling_price in DKK whole kroner (øre / 100)
    // lowest is 599900 øre = 5999 kr
    expect(result!.fromPrice).toBe(5999);
    expect(result!.stockCount).toBe(3);
    expect(result!.topGrade).toBe('A');
    expect(result!.isFallback).toBe(false);
    // originalPrice from default_attributes.original_price = 12000 kr
    expect(result!.originalPrice).toBe(12000);
    // savings = 12000 - 5999 = 6001
    expect(result!.savings).toBe(6001);
  });

  // -------------------------------------------------------------------------
  // Test 2: returns fallback when nothing is featured
  // -------------------------------------------------------------------------
  it('returns the fallback template with isFallback: true when nothing is featured', async () => {
    const fallbackTemplate = {
      ...fakeTemplate,
      id: 'tmpl-2',
      slug: 'apple-iphone-14-pro',
      display_name: 'iPhone 14 Pro',
      featured_priority: null,
      default_attributes: {},
    };
    const fallbackDevices = [
      { id: 'd4', grade: 'B' as const, selling_price: 499900, status: 'listed', template_id: 'tmpl-2', storage: '128GB', color: 'Deep Purple' },
    ];

    // templateMock for active query returns null (no active featured product)
    const activeTemplateMock = makeTemplateMock({ data: null, error: null });
    // fallback template mock
    const fallbackTemplateMock = makeFallbackTemplateMock({ data: fallbackTemplate, error: null });
    const devicesMock = makeDevicesMock({ data: fallbackDevices, error: null });

    let templateCallCount = 0;
    const fromFn = vi.fn((table: string) => {
      if (table === 'product_templates') {
        templateCallCount++;
        if (templateCallCount === 1) {
          // first call: active featured query
          return { select: activeTemplateMock.select };
        } else {
          // second call: fallback query
          return { select: fallbackTemplateMock.select };
        }
      }
      if (table === 'devices') {
        return { select: devicesMock.select };
      }
      return {};
    });

    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await _getFeaturedProductUncached();

    expect(result).not.toBeNull();
    expect(result!.isFallback).toBe(true);
    expect(result!.template.slug).toBe('apple-iphone-14-pro');
    expect(result!.fromPrice).toBe(4999);
    expect(result!.stockCount).toBe(1);
    expect(result!.topGrade).toBe('B');
    expect(result!.originalPrice).toBeNull();
    expect(result!.savings).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 3: returns null when both queries throw
  // -------------------------------------------------------------------------
  it('returns null when both active and fallback queries throw', async () => {
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        throw new Error('DB connection failed');
      }),
    });

    const result = await _getFeaturedProductUncached();

    expect(result).toBeNull();
  });
});
