import { google } from "googleapis";

/**
 * Webshop-tragten fra GA4 for en vilkårlig periode: besøg (sessions) og lagt i
 * kurv (addToCarts). Samme opsætning som /api/dashboard/ga4: GA4_PROPERTY_ID og
 * GOOGLE_SERVICE_ACCOUNT_JSON. Uden opsætning, eller hvis kaldet fejler, null.
 */
/** Er GA4 sat op? Uden opsætning er en tom tragt forventet, ikke en fejl. */
export function ga4Configured(): boolean {
  return Boolean(process.env.GA4_PROPERTY_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

export async function loadFunnel(startDate: string, endDate: string): Promise<{ visits: number; addToCart: number } | null> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !credsRaw) return null;

  try {
    const credentials = JSON.parse(credsRaw) as { client_email: string; private_key: string };
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        // Vercel gemmer ofte linjeskift som \n
        private_key: credentials.private_key.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    const analytics = google.analyticsdata({ version: "v1beta", auth });
    const res = await analytics.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "sessions" }, { name: "addToCarts" }],
      },
    });
    const values = res.data.rows?.[0]?.metricValues ?? [];
    const num = (i: number) => {
      const n = Number(values[i]?.value ?? 0);
      return Number.isFinite(n) ? Math.round(n) : 0;
    };
    return { visits: num(0), addToCart: num(1) };
  } catch (err) {
    console.error("GA4-tragt fejlede:", err);
    return null;
  }
}
