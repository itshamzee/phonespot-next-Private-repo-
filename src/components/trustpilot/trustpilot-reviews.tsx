import { getTrustpilotReviews, getTrustpilotSummary } from "@/lib/trustpilot/client";

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={i < count ? "#00b67a" : "#dcdce6"}
          className="h-4 w-4"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export async function TrustpilotReviews() {
  const [reviews, summary] = await Promise.all([
    getTrustpilotReviews(3),
    getTrustpilotSummary(),
  ]);

  if (!summary || reviews.length === 0) return null;

  return (
    <div>
      {/* Summary header */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <StarRow count={summary.stars} />
        <span className="text-lg font-bold text-charcoal">
          {summary.score.toFixed(1)}/5
        </span>
        <span className="text-sm text-gray">
          baseret på {summary.numberOfReviews.toLocaleString("da-DK")} anmeldelser
        </span>
      </div>

      {/* Review cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-soft-grey bg-white p-6 shadow-sm"
          >
            <StarRow count={review.stars} />
            <h4 className="mt-3 font-display text-base font-bold text-charcoal">
              {review.title}
            </h4>
            <p className="mt-2 line-clamp-3 text-sm text-charcoal/70">
              {review.text}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-charcoal">
                {review.consumer.displayName}
              </span>
              <span className="text-xs text-gray">
                {new Date(review.createdAt).toLocaleDateString("da-DK")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA link */}
      <div className="mt-6 text-center">
        <a
          href="https://dk.trustpilot.com/review/phonespot.dk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-eco hover:underline"
        >
          Se alle anmeldelser på Trustpilot
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
    </div>
  );
}
