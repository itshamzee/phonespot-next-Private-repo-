import type { TrustpilotReview, TrustpilotSummary } from "./types";

const BUSINESS_UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID ?? "";
const API_KEY = process.env.TRUSTPILOT_API_KEY ?? "";
const BASE = "https://api.trustpilot.com/v1/business-units";

async function trustpilotFetch<T>(path: string): Promise<T | null> {
  if (!BUSINESS_UNIT_ID || !API_KEY) return null;
  const res = await fetch(`${BASE}/${BUSINESS_UNIT_ID}${path}`, {
    headers: { apikey: API_KEY },
    next: { revalidate: 3600 }, // 1 hour ISR cache
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function getTrustpilotSummary(): Promise<TrustpilotSummary | null> {
  const data = await trustpilotFetch<{
    score: { trustScore: number; stars: number };
    numberOfReviews: { total: number };
  }>("");
  if (!data) return null;
  return {
    score: data.score.trustScore,
    stars: data.score.stars,
    numberOfReviews: data.numberOfReviews.total,
  };
}

export async function getTrustpilotReviews(
  count = 3,
): Promise<TrustpilotReview[]> {
  const data = await trustpilotFetch<{
    reviews: {
      id: string;
      stars: number;
      title: string;
      text: string;
      createdAt: string;
      consumer: { displayName: string };
    }[];
  }>(`/reviews?perPage=${count}&stars=4,5&orderBy=createdat.desc`);
  if (!data) return [];
  return data.reviews.map((r) => ({
    id: r.id,
    stars: r.stars,
    title: r.title,
    text: r.text,
    createdAt: r.createdAt,
    consumer: { displayName: r.consumer.displayName },
  }));
}
