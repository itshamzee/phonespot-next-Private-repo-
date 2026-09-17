import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Henter en offentlig URL uden at kunne bruges som SSRF-vektor:
 * kun https, ingen private/link-local/loopback-adresser (kontrolleret via DNS
 * pr. hop), manuelle redirects med samme kontrol, højst 3 hop.
 */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const n = ipv4ToInt(ip);
    const inRange = (cidr: string) => {
      const [base, bits] = cidr.split("/");
      const mask = bits === "0" ? 0 : (~0 << (32 - Number(bits))) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    };
    return ["0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.168.0.0/16", "198.18.0.0/15", "224.0.0.0/3"].some(inRange);
  }
  if (family === 6) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true;
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return false;
  }
  return true;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Ugyldig adresse"); }
  if (url.protocol !== "https:") throw new Error("Kun https-adresser");
  if (url.username || url.password) throw new Error("Ugyldig adresse");
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Adressen er ikke tilladt");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw new Error("Adressen kunne ikke slås op");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("Adressen er ikke tilladt");
  return url;
}

export async function safeFetchPublic(raw: string, init: { headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<Response> {
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, { headers: init.headers, redirect: "manual", signal: AbortSignal.timeout(init.timeoutMs ?? 15000) });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Ugyldig omdirigering");
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("For mange omdirigeringer");
}
