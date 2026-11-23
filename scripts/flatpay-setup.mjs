#!/usr/bin/env node
/**
 * Flatpay first-day setup and check. Talks to the Flatpay Socket API only;
 * touches no database.
 *
 *   node scripts/flatpay-setup.mjs                      login (or use FLATPAY_GUID), list terminals, check connection
 *   node scripts/flatpay-setup.mjs --test TID 100       start a real 1,00 kr SALE on terminal TID and wait for it
 *   node scripts/flatpay-setup.mjs --cancel TID REF     cancel a pending transaction
 *
 * Credentials come from the environment (or .env.local via `node --env-file=.env.local`):
 *   FLATPAY_GUID, or FLATPAY_USERNAME + FLATPAY_PASSWORD
 *   FLATPAY_API_URL (optional)
 */
import { randomUUID } from "node:crypto";

const BASE = (process.env.FLATPAY_API_URL || "https://socket-api.flatpay.dk").replace(/\/+$/, "");

async function call(method, path, { query, body } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* plain text */
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function getGuid() {
  if (process.env.FLATPAY_GUID) return process.env.FLATPAY_GUID.trim();
  const { FLATPAY_USERNAME: username, FLATPAY_PASSWORD: password } = process.env;
  if (!username || !password) {
    throw new Error("Sæt FLATPAY_GUID eller FLATPAY_USERNAME og FLATPAY_PASSWORD.");
  }
  const data = await call("POST", "/socket/guid", { body: { username, password } });
  const guid = typeof data === "string" ? data.trim() : data?.guid;
  console.log("\nGUID (gem som FLATPAY_GUID i Vercel):", guid);
  return guid;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  console.log("Flatpay API:", BASE, "-", await call("GET", "/socket/healthcheck"));
  const guid = await getGuid();

  if (cmd === "--cancel") {
    console.log(await call("POST", "/socket/transaction/cancel", { body: { transactionReference: b, terminalId: a, guid } }));
    return;
  }

  if (cmd === "--test") {
    const terminalId = a;
    const amount = String(Number(b) || 100);
    const transactionReference = randomUUID();
    console.log(`\nStarter salg på ${terminalId}: ${(Number(amount) / 100).toFixed(2)} kr. (ref ${transactionReference})`);
    await call("POST", "/socket/transaction/start", {
      body: { guid, terminalId, transactionType: "SALE", amount, language: "da_DK", reference: "PhoneSpot test", externalReference: "setup-test", transactionReference },
    });
    for (let i = 0; i < 80; i++) {
      const tx = await call("GET", "/socket/transaction/response", { query: { transactionReference, guid, terminalId } });
      if (tx.status !== "PENDING") {
        console.log(JSON.stringify(tx, null, 2));
        return;
      }
      process.stdout.write(".");
      await sleep(1500);
    }
    console.log("\nIntet svar efter 2 min. Annullerer.");
    console.log(await call("POST", "/socket/transaction/cancel", { body: { transactionReference, terminalId, guid } }));
    return;
  }

  const terminals = await call("GET", "/socket/terminals", { query: { guid } });
  console.log("\nTerminaler:", JSON.stringify(terminals, null, 2));
  const list = Array.isArray(terminals?.terminalList) ? terminals.terminalList : Array.isArray(terminals) ? terminals : [];
  for (const t of list) {
    const tid = typeof t === "string" ? t : t?.tid ?? t?.terminalId;
    if (!tid) continue;
    const c = await call("GET", "/socket/terminal/connection", { query: { terminalId: tid, guid } });
    console.log(`  ${tid}: ${c?.isTerminalConnected ? "forbundet" : "IKKE forbundet"}`);
  }
  console.log("\nSæt FLATPAY_TERMINAL_VEJLE / FLATPAY_TERMINAL_SLAGELSE til den rigtige TID i Vercel.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
