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
      { source: "/products/:path*", destination: "/iphones", permanent: true },
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
    ];
  },
};

export default nextConfig;
