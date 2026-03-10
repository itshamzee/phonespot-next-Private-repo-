/**
 * Static mapping of model slugs to product image URLs.
 *
 * Apple images: cdsassets.apple.com (from support.apple.com "identify your device" pages)
 * Samsung images: images.samsung.com (official product gallery CDN)
 *
 * Models not listed here fall back to the SVG silhouette in <DeviceImage />.
 * To refresh Supabase image_url columns, run:  node scripts/update-device-images.mjs
 */

const APPLE_CDN = "https://cdsassets.apple.com/live/7WUAS350/images";

export const DEVICE_IMAGES: Record<string, string> = {
  // ── iPhones ──────────────────────────────────────────────────────────
  "iphone-16-pro-max": `${APPLE_CDN}/iphone/iphone-16-pro-max-colors.png`,
  "iphone-16-pro": `${APPLE_CDN}/iphone/iphone-16-pro-colors.png`,
  "iphone-16-plus": `${APPLE_CDN}/iphone/iphone-16-plus-colors.png`,
  "iphone-16": `${APPLE_CDN}/iphone/iphone-16-colors.png`,

  "iphone-15-pro-max": `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15-pro-max.png`,
  "iphone-15-pro": `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15-pro.png`,
  "iphone-15-plus": `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15-plus.png`,
  "iphone-15": `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15.png`,

  "iphone-14-pro-max": `${APPLE_CDN}/iphone/iphone-14-pro-max-colors.png`,
  "iphone-14-pro": `${APPLE_CDN}/iphone/iphone-14-pro-colors.png`,
  "iphone-14-plus": `${APPLE_CDN}/iphone/iphone-14-plus-colors-spring-2023.png`,
  "iphone-14": `${APPLE_CDN}/iphone/iphone-14-colors-spring-2023.png`,

  "iphone-13-pro-max": `${APPLE_CDN}/iphone/2022-spring-iphone13-pro-max-colors.png`,
  "iphone-13-pro": `${APPLE_CDN}/iphone/2022-spring-iphone13-pro-colors.png`,
  "iphone-13": `${APPLE_CDN}/iphone/2022-spring-iphone13-colors.png`,
  "iphone-13-mini": `${APPLE_CDN}/iphone/2022-iphone13-mini-colors.png`,

  "iphone-12-pro-max": `${APPLE_CDN}/iphone/iphone-12-pro-max/iphone12-pro-max-colors.jpg`,
  "iphone-12-pro": `${APPLE_CDN}/iphone/iphone-12-pro/iphone12-pro-colors.jpg`,
  "iphone-12": `${APPLE_CDN}/iphone/2021-iphone12-colors.png`,
  "iphone-12-mini": `${APPLE_CDN}/iphone/2021-iphone12-mini-colors.png`,

  "iphone-se-3-gen": `${APPLE_CDN}/iphone/iphone-se-3rd-gen-colors.png`,

  "iphone-11-pro-max": `${APPLE_CDN}/iphone/identify-iphone-11pro-max.jpg`,
  "iphone-11-pro": `${APPLE_CDN}/iphone/identify-iphone-11pro.jpg`,
  "iphone-11": `${APPLE_CDN}/iphone/identify-iphone-11-colors.jpg`,

  "iphone-xs-max": `${APPLE_CDN}/iphone/iphone-xs-max-colors.jpg`,
  "iphone-xr": `${APPLE_CDN}/iphone/iphone-xr/identify-iphone-xr-colors.jpg`,

  // ── iPads ────────────────────────────────────────────────────────────
  "ipad-pro-13-m4": `${APPLE_CDN}/ipad/spring-2024-1.png`,
  "ipad-pro-11-m4": `${APPLE_CDN}/ipad/spring-2024-2.png`,
  "ipad-air-m2": `${APPLE_CDN}/ipad/spring-2024-3.png`,
  "ipad-10-gen": `${APPLE_CDN}/ipad/ipad/fall-2022-10-gen-ipad.png`,
  "ipad-9-gen": `${APPLE_CDN}/ipad/ipad/ipad-2021-colors.png`,
  "ipad-mini-6": `${APPLE_CDN}/ipad/ipad/ipad-mini-2021-colors.png`,

  // ── MacBooks ─────────────────────────────────────────────────────────
  "macbook-pro-16-m4": `${APPLE_CDN}/macbook-pro/macbook-pro-16in-2024-colors.png`,
  "macbook-pro-14-m4": `${APPLE_CDN}/macbook-pro/macbook-pro-14in-2024-m4-pro-m4-max-colors.png`,
  "macbook-air-15-m3": `${APPLE_CDN}/macbook-air/2024-macbook-air-15in-m3-colors.png`,
  "macbook-air-13-m3": `${APPLE_CDN}/macbook-air/2024-macbook-air-13in-m3-colors.png`,

  // ── Apple Watch ──────────────────────────────────────────────────────
  "apple-watch-ultra-2": `${APPLE_CDN}/apple-watch/apple-watch-ultra-2-colors.png`,
  "apple-watch-series-9": `${APPLE_CDN}/apple-watch/apple-watch-series-9-gps.png`,
  "apple-watch-series-8": `${APPLE_CDN}/apple-watch/fall-2022-watch-series8-aluminum-gps.png`,
  "apple-watch-se-2-gen": `${APPLE_CDN}/apple-watch/fall-2022-watch-series8-se-gps.png`,

  // ── Samsung Galaxy S-series ──────────────────────────────────────────
  "galaxy-s25-ultra":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2501/gallery/us-galaxy-s25-ultra-s938-sm-s938bzkdxaa-544706282?$650_519_PNG$",
  "galaxy-s25+":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2501/gallery/us-galaxy-s25-plus-s936-sm-s936blbdxaa-544705927?$650_519_PNG$",
  "galaxy-s25":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2501/gallery/us-galaxy-s25-s931-sm-s931ulbdxaa-544705484?$650_519_PNG$",

  "galaxy-s24-ultra":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2401/gallery/us-galaxy-s24-ultra-s928-sm-s928bzkdxaa-537244544?$650_519_PNG$",
  "galaxy-s24+":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2401/gallery/us-galaxy-s24-plus-s926-sm-s926bzkdxaa-537243961?$650_519_PNG$",
  "galaxy-s24":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2401/gallery/us-galaxy-s24-s921-sm-s921ulbdxaa-537243464?$650_519_PNG$",

  "galaxy-s23-ultra":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2302/gallery/us-galaxy-s23-ultra-s918-sm-s918bzkdxaa-534856837?$650_519_PNG$",
  "galaxy-s23+":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2302/gallery/us-galaxy-s23-plus-s916-sm-s916bzkdxaa-534856325?$650_519_PNG$",
  "galaxy-s23":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2302/gallery/us-galaxy-s23-s911-sm-s911ulbdxaa-534855782?$650_519_PNG$",

  // ── Samsung Galaxy A-series ──────────────────────────────────────────
  "galaxy-a55":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2403/gallery/us-galaxy-a55-5g-a556-sm-a556ezkdxaa-538960064?$650_519_PNG$",
  "galaxy-a54":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2303/gallery/us-galaxy-a54-5g-a546-sm-a546uzkdxaa-535182920?$650_519_PNG$",
  "galaxy-a35":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2403/gallery/us-galaxy-a35-5g-a356-sm-a356ezkdxaa-538960547?$650_519_PNG$",
  "galaxy-a34":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2303/gallery/us-galaxy-a34-5g-a346-sm-a346ezkdxaa-535183274?$650_519_PNG$",
  "galaxy-a15":
    "https://images.samsung.com/is/image/samsung/p6pim/us/2312/gallery/us-galaxy-a15-5g-a156-sm-a156uzkdxaa-537839614?$650_519_PNG$",
};

/**
 * Look up the product image URL for a given model slug.
 * Returns null when no mapping exists (caller should show SVG silhouette).
 */
export function getDeviceImageUrl(modelSlug: string): string | null {
  return DEVICE_IMAGES[modelSlug] ?? null;
}
