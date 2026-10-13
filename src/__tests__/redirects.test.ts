// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

type R = { source: string; destination: string; statusCode?: number; permanent?: boolean };

async function load(shopifyDomain = ""): Promise<R[]> {
  vi.resetModules();
  vi.stubEnv("SHOPIFY_STORE_DOMAIN", shopifyDomain);
  vi.stubEnv("NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN", "");
  const { default: config } = await import("../../next.config");
  return (await config.redirects!()) as R[];
}
const find = (rs: R[], source: string) => rs.find((r) => r.source === source);
afterEach(() => vi.unstubAllEnvs());

describe("redirects", () => {
  it("apply even when no Shopify domain is configured", async () => {
    const rs = await load("");
    expect(find(rs, "/reservedele")).toMatchObject({ destination: "/reparation", statusCode: 301 });
    expect(find(rs, "/cart/c/:path*")).toBeUndefined();
  });

  it.each(["/reservedele", "/reservedele/:path*", "/api/spare-parts", "/api/spare-parts/:path*"])(
    "%s sends a 301 to /reparation",
    async (source) => {
      expect(find(await load(), source)).toMatchObject({ destination: "/reparation", statusCode: 301 });
    },
  );

  it.each(["/ipad-6-reservedele", "/iphone-12-pro-max-reservedele", "/iphone-13-mini-reservedele", "/iphone-14-reservedele"])(
    "old Shopify URL %s goes straight to /reparation without a chain",
    async (source) => {
      expect(find(await load(), source)?.destination).toBe("/reparation");
    },
  );

  it("keeps the Shopify checkout redirects when a domain is set", async () => {
    const rs = await load("phonespot.myshopify.com");
    expect(find(rs, "/cart/c/:path*")?.destination).toBe("https://phonespot.myshopify.com/cart/c/:path*");
  });
});
