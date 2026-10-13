import { expect, test } from "@playwright/test";

test.describe("reservedele er lukket", () => {
  for (const path of ["/reservedele", "/reservedele/skaerme", "/reservedele/skaerme/apple/iphone-13", "/api/spare-parts"]) {
    test(`${path} sender 301 til /reparation`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(res.headers()["location"]).toMatch(/\/reparation$/);
    });
  }

  for (const path of ["/b2b", "/b2b/registrer"]) {
    test(`${path} sender 301 til /erhverv`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(res.headers()["location"]).toMatch(/\/erhverv$/);
    });
  }
});
