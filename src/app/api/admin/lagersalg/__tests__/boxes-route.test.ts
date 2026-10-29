// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PosError } from "@/lib/pos/errors";

const m = vi.hoisted(() => ({
  open: null as null | Record<string, unknown>,
  maxNumber: null as null | number,
  boxRow: { id: "8a3f6c2e-1b2d-4c5e-9f00-112233445566", location_id: "L-v" } as null | Record<string, unknown>,
  allowed: true,
  openBox: vi.fn(),
  closeBox: vi.fn(),
}));

vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => ({ id: "st-1", role: "intern", location_slug: "vejle" })),
}));
vi.mock("@/lib/auth/store-scope", () => ({ canAccessStore: () => m.allowed }));
vi.mock("@/lib/accessory-intake/candidates", () => ({
  storeLocations: async () => [
    { id: "L-v", name: "Vejle", type: "store" },
    { id: "L-s", name: "Slagelse", type: "store" },
  ],
}));
vi.mock("@/lib/lagersalg/boxes", () => ({
  currentOpenBox: vi.fn(async () => m.open),
  openBox: m.openBox,
  closeBox: m.closeBox,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from() {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        maybeSingle: async () => ({ data: m.boxRow, error: null }),
        limit: async () => ({ data: m.maxNumber == null ? [] : [{ number: m.maxNumber }], error: null }),
      };
      return q;
    },
  }),
}));

import { GET, POST } from "../boxes/route";

const post = (body: unknown) =>
  new Request("http://x/api/admin/lagersalg/boxes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const BOX = "8a3f6c2e-1b2d-4c5e-9f00-112233445566";

beforeEach(() => {
  m.open = null;
  m.maxNumber = null;
  m.allowed = true;
  m.boxRow = { id: BOX, location_id: "L-v" };
  m.openBox.mockReset();
  m.closeBox.mockReset();
});

describe("GET /api/admin/lagersalg/boxes", () => {
  it("svarer med åben kasse og næste nummer", async () => {
    m.open = { id: BOX, number: 3, status: "open" };
    m.maxNumber = 3;
    const res = await GET(new Request("http://x/api/admin/lagersalg/boxes?store=vejle"));
    expect(await res.json()).toEqual({ open: m.open, nextNumber: 4 });
  });

  it("næste nummer er 1 uden kasser", async () => {
    const body = await (await GET(new Request("http://x/api/admin/lagersalg/boxes?store=vejle"))).json();
    expect(body).toEqual({ open: null, nextNumber: 1 });
  });

  it("afviser en butik medarbejderen ikke har adgang til", async () => {
    m.allowed = false;
    expect((await GET(new Request("http://x/api/admin/lagersalg/boxes?store=slagelse"))).status).toBe(403);
  });
});

describe("POST /api/admin/lagersalg/boxes", () => {
  it("open åbner en kasse", async () => {
    m.openBox.mockResolvedValue({ id: BOX, number: 1, status: "open" });
    const res = await POST(post({ store: "vejle", action: "open" }));
    expect(res.status).toBe(200);
    expect(m.openBox).toHaveBeenCalledWith(expect.anything(), "L-v", "st-1");
    expect(await res.json()).toEqual({ opened: expect.objectContaining({ number: 1 }) });
  });

  it("close lukker og åbner næste", async () => {
    m.closeBox.mockResolvedValue({ closed: { number: 1, status: "closed" }, opened: { number: 2, status: "open" } });
    const res = await POST(post({ store: "vejle", action: "close", boxId: BOX }));
    expect(m.closeBox).toHaveBeenCalledWith(expect.anything(), BOX, "st-1", true);
    expect(await res.json()).toEqual({
      closed: expect.objectContaining({ number: 1, status: "closed" }),
      opened: expect.objectContaining({ number: 2 }),
    });
  });

  it("close på lukket kasse svarer 409", async () => {
    m.closeBox.mockRejectedValue(new PosError("box_not_open", "Kassen er allerede lukket", 409));
    const res = await POST(post({ store: "vejle", action: "close", boxId: BOX }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Kassen er allerede lukket");
  });

  it("open med åben kasse svarer 409", async () => {
    m.openBox.mockRejectedValue({ message: "pos:box_already_open" });
    const res = await POST(post({ store: "vejle", action: "open" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Der er allerede en åben kasse i butikken");
  });

  it("close af en kasse i en anden butik svarer 404 og lukker intet", async () => {
    // Medarbejder med adgang til Slagelse sender Vejles kasse.
    const res = await POST(post({ store: "slagelse", action: "close", boxId: BOX }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Kassen findes ikke");
    expect(m.closeBox).not.toHaveBeenCalled();
    m.boxRow = null;
    expect((await POST(post({ store: "vejle", action: "close", boxId: BOX }))).status).toBe(404);
    expect(m.closeBox).not.toHaveBeenCalled();
  });

  it("kræver boxId ved close og adgang til butikken", async () => {
    expect((await POST(post({ store: "vejle", action: "close" }))).status).toBe(400);
    m.allowed = false;
    expect((await POST(post({ store: "vejle", action: "open" }))).status).toBe(403);
  });
});
