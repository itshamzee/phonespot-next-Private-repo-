// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  product: null as null | Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => ({ id: "o", role: "owner", location_slug: null })),
}));
vi.mock("@/lib/auth/store-scope", () => ({ canAccessStore: () => true }));
vi.mock("@/lib/pos/sessions", () => ({ adjustStock: vi.fn(async () => ({ quantity: 5 })) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: state.product }),
        update: (values: Record<string, unknown>) => {
          state.updates.push(values);
          return { eq: async () => ({ error: null }) };
        },
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: table === "locations" ? [{ id: "L-v", name: "Vejle", type: "store" }] : [] }),
      };
      return q;
    },
  }),
}));

import { POST } from "../route";

const post = (body: unknown) =>
  new Request("http://x/api/admin/accessories/by-ean", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const ID = "8a3f6c2e-1b2d-4c5e-9f00-112233445566";

beforeEach(() => {
  state.updates = [];
});

describe("POST /api/admin/accessories/by-ean med publish", () => {
  it("kladde-cover publiceres til 79 kr. med udsalg", async () => {
    state.product = { category: "accessory", status: "draft", subcategory: "cover", selling_price: 19900, attributes: { case_type: "Slim" } };
    const res = await POST(post({ productId: ID, store: "vejle", quantity: 2, publish: { priceKr: 79 } }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(state.updates[0]).toEqual({ status: "published", selling_price: 7900, attributes: { case_type: "Slim", udsalg: "Ja" } });
    expect(data).toMatchObject({ quantity: 5, published: true, priceKr: 79 });
  });

  it("kladde-oplader publiceres til eksisterende pris uden udsalg", async () => {
    state.product = { category: "accessory", status: "draft", subcategory: "charger", selling_price: 14900, attributes: {} };
    const data = await (await POST(post({ productId: ID, store: "vejle", quantity: 1, publish: { priceKr: 79 } }))).json();
    expect(state.updates[0]).toEqual({ status: "published" });
    expect(data).toMatchObject({ published: true, priceKr: 149 });
  });

  it("publiceret vare beholder pris selvom priceKr sendes", async () => {
    state.product = { category: "accessory", status: "published", subcategory: "cover", selling_price: 19900, attributes: {} };
    const data = await (await POST(post({ productId: ID, store: "vejle", quantity: 1, publish: { priceKr: 59 } }))).json();
    expect(state.updates).toEqual([]);
    expect(data).toMatchObject({ published: false, priceKr: 199 });
  });

  it("uden publish lægges kun lager", async () => {
    state.product = { category: "accessory", status: "draft", subcategory: "cover", selling_price: 19900, attributes: {} };
    const data = await (await POST(post({ productId: ID, store: "vejle", quantity: 1 }))).json();
    expect(state.updates).toEqual([]);
    expect(data).toMatchObject({ quantity: 5, published: false });
  });
});
