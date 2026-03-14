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
    ];
  },
};

export default nextConfig;
