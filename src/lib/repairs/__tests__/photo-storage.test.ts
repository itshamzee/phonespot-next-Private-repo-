import { describe, expect, it, vi } from "vitest";
import {
  REPAIR_PHOTO_BUCKET,
  repairPhotoPath,
  signRepairPhotoValues,
  withSignedRepairPhotos,
} from "../photo-storage";

const SUPA = "https://abc.supabase.co/storage/v1/object";

function fakeClient(opts: { fail?: boolean } = {}) {
  const createSignedUrls = vi.fn(async (paths: string[], seconds: number) => {
    if (opts.fail) return { data: null, error: { message: "boom" } };
    return {
      data: paths.map((path) => ({ path, signedUrl: `${SUPA}/sign/${REPAIR_PHOTO_BUCKET}/${path}?token=t&e=${seconds}`, error: null })),
      error: null,
    };
  });
  const from = vi.fn(() => ({ createSignedUrls }));
  return { client: { storage: { from } } as never, createSignedUrls, from };
}

describe("repairPhotoPath", () => {
  it("recognises bare paths in the private folders", () => {
    expect(repairPhotoPath("intake/1-a.jpg")).toBe("intake/1-a.jpg");
    expect(repairPhotoPath("checklist/x.png")).toBe("checklist/x.png");
    expect(repairPhotoPath("checkout/x.png")).toBe("checkout/x.png");
  });

  it("extracts the path from repair-photos URLs (public or signed)", () => {
    expect(repairPhotoPath(`${SUPA}/public/repair-photos/intake/a%20b.jpg`)).toBe("intake/a b.jpg");
    expect(repairPhotoPath(`${SUPA}/sign/repair-photos/intake/a.jpg?token=x`)).toBe("intake/a.jpg");
  });

  it("returns null for legacy device-photos URLs, external URLs and junk", () => {
    expect(repairPhotoPath(`${SUPA}/public/device-photos/intake/a.jpg`)).toBeNull();
    expect(repairPhotoPath("https://example.com/a.jpg")).toBeNull();
    expect(repairPhotoPath("misc/a.jpg")).toBeNull();
    expect(repairPhotoPath("")).toBeNull();
    expect(repairPhotoPath(null)).toBeNull();
  });
});

describe("signRepairPhotoValues", () => {
  it("signs private paths with a short expiry and keeps other values", async () => {
    const { client, createSignedUrls, from } = fakeClient();
    const legacy = `${SUPA}/public/device-photos/intake/old.jpg`;
    const out = await signRepairPhotoValues(client, ["intake/a.jpg", legacy, null, "intake/a.jpg"]);
    expect(from).toHaveBeenCalledWith("repair-photos");
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls.mock.calls[0][0]).toEqual(["intake/a.jpg"]);
    expect(createSignedUrls.mock.calls[0][1]).toBeLessThanOrEqual(900);
    expect(out[0]).toContain("/sign/repair-photos/intake/a.jpg");
    expect(out[0]).toContain("token=");
    expect(out[1]).toBe(legacy);
    expect(out[2]).toBeNull();
    expect(out[3]).toBe(out[0]);
  });

  it("never falls back to a public URL when signing fails", async () => {
    const { client } = fakeClient({ fail: true });
    const out = await signRepairPhotoValues(client, ["intake/a.jpg"]);
    expect(out).toEqual([null]);
  });

  it("does not call storage when there is nothing to sign", async () => {
    const { client, createSignedUrls } = fakeClient();
    await signRepairPhotoValues(client, [null, "https://example.com/x.jpg"]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});

describe("withSignedRepairPhotos", () => {
  it("signs intake photos, checkout photos and checklist photos", async () => {
    const { client } = fakeClient();
    const ticket = {
      id: "t1",
      intake_photos: ["intake/1.jpg", "intake/2.jpg"],
      checkout_photos: ["checkout/1.jpg"],
      intake_checklist: [
        { label: "Skærm", photo_url: "checklist/s.jpg" },
        { label: "Kamera", photo_url: null },
      ],
    };
    const out = await withSignedRepairPhotos(client, ticket);
    expect(out.id).toBe("t1");
    expect(out.intake_photos).toHaveLength(2);
    expect(out.intake_photos.every((u) => u.includes("token="))).toBe(true);
    expect(out.checkout_photos[0]).toContain("checkout/1.jpg");
    expect(out.intake_checklist[0].photo_url).toContain("checklist/s.jpg");
    expect(out.intake_checklist[1].photo_url).toBeNull();
    expect(out.intake_checklist[0].label).toBe("Skærm");
  });

  it("returns the ticket untouched when there are no photos", async () => {
    const { client, createSignedUrls } = fakeClient();
    const ticket = { intake_photos: [], checkout_photos: [], intake_checklist: [{ label: "x", photo_url: null }] };
    expect(await withSignedRepairPhotos(client, ticket)).toBe(ticket);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});
