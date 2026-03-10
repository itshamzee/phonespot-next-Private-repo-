#!/usr/bin/env node
/**
 * Get Shopify Admin API access token via OAuth.
 *
 * Usage:
 *   node scripts/get-shopify-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * This starts a local server, opens your browser to authorize,
 * and captures the access token automatically.
 */

import http from "node:http";
import { execFileSync } from "node:child_process";

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const SHOP = "c47a26-4.myshopify.com";
const SCOPES = "write_products,read_products";
const REDIRECT_URI = "http://localhost:3456/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\n  Usage: node scripts/get-shopify-token.mjs <CLIENT_ID> <CLIENT_SECRET>\n");
  console.error("  Get these from dev dashboard → Settings → Credentials\n");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3456");

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400);
      res.end("No code received");
      return;
    }

    // Exchange code for access token
    try {
      const tokenRes = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        }),
      });

      const data = await tokenRes.json();

      if (data.access_token) {
        console.log("\n  ======================================");
        console.log("  SUCCESS! Your Admin API access token:");
        console.log(`  ${data.access_token}`);
        console.log("  ======================================\n");
        console.log("  Now run:");
        console.log(`  node scripts/fix-shopify-products.mjs ${data.access_token}\n`);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html><body style="font-family:system-ui;text-align:center;padding:60px">
            <h1>Success!</h1>
            <p>Access token has been printed in your terminal.</p>
            <p>You can close this tab.</p>
          </body></html>
        `);
      } else {
        console.error("\n  Error getting token:", data);
        res.writeHead(500);
        res.end("Failed to get token: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error("\n  Error:", err.message);
      res.writeHead(500);
      res.end("Error: " + err.message);
    }

    setTimeout(() => process.exit(0), 1000);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3456, () => {
  const authUrl = `https://${SHOP}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  console.log("\n  Shopify OAuth Token Helper");
  console.log("  ==========================\n");
  console.log("  Opening browser to authorize...\n");
  console.log(`  If it doesn't open, visit:\n  ${authUrl}\n`);

  // Open browser on Windows
  try {
    execFileSync("cmd", ["/c", "start", "", authUrl], { stdio: "ignore" });
  } catch {
    console.log("  Could not open browser automatically. Please visit the URL above.\n");
  }
});
