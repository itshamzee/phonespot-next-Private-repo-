import { google } from "googleapis";

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface KeywordRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export function createGSCClient(credentialsJson: string, siteUrl: string) {
  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const searchconsole = google.searchconsole({ version: "v1", auth });

  async function fetchKeywords(
    startDate: string,
    endDate: string
  ): Promise<KeywordRow[]> {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query", "page"],
        rowLimit: 25000,
      },
    });

    return (res.data.rows ?? []).map((row) => {
      const r = row as unknown as GSCRow;
      return {
        query: r.keys[0],
        page: r.keys[1],
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      };
    });
  }

  async function fetchPages(
    startDate: string,
    endDate: string
  ): Promise<PageRow[]> {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 25000,
      },
    });

    return (res.data.rows ?? []).map((row) => {
      const r = row as unknown as GSCRow;
      return {
        page: r.keys[0],
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      };
    });
  }

  return { fetchKeywords, fetchPages };
}
