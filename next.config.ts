import type { NextConfig } from "next";

const shopifyDomain =
  process.env.SHOPIFY_STORE_DOMAIN ??
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ??
  "";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "*.medusa-cloud.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
  async redirects() {
    // Shopify checkout URLs must go to the .myshopify.com domain,
    // not the custom domain served by Next.js.
    if (!shopifyDomain) return [];
    return [
      {
        source: "/cart/c/:path*",
        destination: `https://${shopifyDomain}/cart/c/:path*`,
        permanent: false,
      },
      {
        source: "/checkouts/:path*",
        destination: `https://${shopifyDomain}/checkouts/:path*`,
        permanent: false,
      },
      // Old Shopify URLs → new pages
      { source: "/collections/:path*", destination: "/iphones", permanent: true },
      { source: "/pages/iphones", destination: "/iphones", permanent: true },
      { source: "/pages/contact", destination: "/kontakt", permanent: true },
      { source: "/pages/hvorfor-vaelge-phonespot", destination: "/hvorfor-phonespot", permanent: true },
      { source: "/products", destination: "/iphones", permanent: true },
      // Only match single-segment Shopify product URLs (e.g. /products/iphone-12).
      // Nested paths like /products/trusmi-glasses/02.webp are real public assets
      // and must NOT be redirected.
      { source: "/products/:slug", destination: "/iphones", permanent: true },
      { source: "/blogs/:path*", destination: "/blog", permanent: true },
      { source: "/search", destination: "/soeg", permanent: true },
      // Old reservedele URLs
      { source: "/ipad-6-reservedele", destination: "/reservedele", permanent: true },
      { source: "/iphone-12-pro-max-reservedele", destination: "/reservedele", permanent: true },
      { source: "/iphone-13-mini-reservedele", destination: "/reservedele", permanent: true },
      { source: "/iphone-14-reservedele", destination: "/reservedele", permanent: true },
      { source: "/iphone-11-pro", destination: "/iphones/apple-iphone-11-pro", permanent: true },
      // Old tilbehør sub-paths that 5xx
      { source: "/tilbehoer/iphone/:slug*", destination: "/tilbehoer", permanent: true },
      { source: "/tilbehoer/ipad/:slug*", destination: "/tilbehoer", permanent: true },
      { source: "/tilbehoer/smartwatch/:slug*", destination: "/tilbehoer", permanent: true },
      { source: "/tilbehoer/other/:slug*", destination: "/tilbehoer", permanent: true },
      { source: "/tilbehoer/laptop/:slug*", destination: "/tilbehoer", permanent: true },
      { source: "/tilbehoer/smartphone/:slug*", destination: "/tilbehoer", permanent: true },
      // Misc dead pages
      { source: "/usb-c", destination: "/tilbehoer", permanent: true },
      { source: "/str", destination: "/", permanent: true },
      { source: "/services/login_with_shop", destination: "/", permanent: true },
      // Legacy tempered-glass URLs → new Spot URLs
      { source: "/tilbehoer/skaermbeskyttelse", destination: "/beskyttelsesglas", permanent: true },
      { source: "/tilbehoer/skaermbeskyttelse/:model", destination: "/beskyttelsesglas/apple/:model", permanent: true },

      // Location-prefixed repair URLs — the /reparation/[location]/... dynamic
      // route was disabled (commit 79cc23d). Google has ~400 such URLs indexed
      // from the earlier sitemap. Redirect them to the static landing pages
      // or to the brand-level model detail.
      { source: "/reparation/vejle", destination: "/reparation-vejle", permanent: true },
      { source: "/reparation/slagelse", destination: "/reparation-slagelse", permanent: true },
      { source: "/reparation/vejle/:brand", destination: "/reparation/:brand", permanent: true },
      { source: "/reparation/slagelse/:brand", destination: "/reparation/:brand", permanent: true },
      { source: "/reparation/vejle/:brand/:model", destination: "/reparation/:brand/:model", permanent: true },
      { source: "/reparation/slagelse/:brand/:model", destination: "/reparation/:brand/:model", permanent: true },

      // Trusmi short links (used in social/Meta ads)
      { source: "/trusmi", destination: "/trusmi-briller", permanent: false },
      { source: "/oversaetterbriller", destination: "/trusmi-briller", permanent: false },

      // Legacy Shopify repair URLs (indexed by Google before migration)
      { source: "/pages/reparation", destination: "/reparation", permanent: true },
      { source: "/pages/iphone-reparation", destination: "/reparation/iphone", permanent: true },
      { source: "/pages/samsung-reparation", destination: "/reparation/samsung", permanent: true },
      { source: "/pages/ipad-reparation", destination: "/reparation/ipad", permanent: true },
      { source: "/pages/macbook-reparation", destination: "/reparation/macbook", permanent: true },
      { source: "/pages/skaermskift", destination: "/reparation", permanent: true },
      { source: "/pages/batteriskift", destination: "/reparation", permanent: true },
    ];
  },
};

export default nextConfig;
