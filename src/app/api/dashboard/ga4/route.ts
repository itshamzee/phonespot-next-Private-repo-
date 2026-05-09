import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/dashboard/ga4?period=<today|week|month>
 *
 * Returns GA4 traffic snapshot for the dashboard tile.
 *
 * Requires two env vars in production:
 *   GA4_PROPERTY_ID                 — numeric GA4 property id (no "properties/" prefix)
 *   GOOGLE_SERVICE_ACCOUNT_JSON     — full service-account JSON (single line)
 *                                     The service account email must be
 *                                     granted at least Viewer access to the
 *                                     GA4 property.
 *
 * If either env var is missing the route returns { configured: false }
 * so the UI can show a friendly "configure GA4" state instead of erroring.
 */
export async function GET(request: NextRequest) {
  // Auth gate (mirrors /api/dashboard)
  const supabase = createServerClient();
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!staff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!propertyId || !credsRaw) {
    return NextResponse.json({ configured: false });
  }

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(credsRaw);
  } catch {
    return NextResponse.json(
      { error: "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "week";
  const dateRange = resolveDateRange(period);

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        // Vercel env vars often store newlines as \n literals
        private_key: credentials.private_key.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    const analytics = google.analyticsdata({ version: "v1beta", auth });
    const property = `properties/${propertyId}`;

    const [overviewRes, pagesRes, sourcesRes] = await Promise.all([
      analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges: [dateRange],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "conversions" },
          ],
        },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges: [dateRange],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "5",
        },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges: [dateRange],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "5",
        },
      }),
    ]);

    const overviewRow = overviewRes.data.rows?.[0]?.metricValues ?? [];
    const sessions = parseInt(overviewRow[0]?.value ?? "0", 10);
    const users = parseInt(overviewRow[1]?.value ?? "0", 10);
    const pageViews = parseInt(overviewRow[2]?.value ?? "0", 10);
    const conversions = parseFloat(overviewRow[3]?.value ?? "0");

    const topPages = (pagesRes.data.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? "",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));

    const topSources = (sourcesRes.data.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? "",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));

    return NextResponse.json({
      configured: true,
      period,
      dateRange,
      kpis: { sessions, users, pageViews, conversions },
      topPages,
      topSources,
    });
  } catch (err) {
    console.error("GA4 API error:", err);
    return NextResponse.json(
      {
        configured: true,
        error:
          (err as Error)?.message ??
          "GA4-kald fejlede — tjek at service-kontoen har adgang til property'et",
      },
      { status: 500 },
    );
  }
}

function resolveDateRange(period: string): { startDate: string; endDate: string } {
  switch (period) {
    case "today":
      return { startDate: "today", endDate: "today" };
    case "month":
      return { startDate: "30daysAgo", endDate: "today" };
    case "week":
    default:
      return { startDate: "7daysAgo", endDate: "today" };
  }
}
