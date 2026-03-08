import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Betaling gennemført - PhoneSpot Reparation",
  robots: { index: false, follow: false },
};

export default async function BekraeftelsePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  const shortTicket = ticket ? ticket.slice(0, 8) : null;

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16 font-body">
      <div className="w-full max-w-2xl rounded-2xl border border-green-eco/20 bg-green-eco/5 p-8 md:p-12">
        {/* Success icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-eco">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="mb-3 text-center font-display text-2xl font-bold text-charcoal md:text-3xl">
          Tak! Din reparation er betalt
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-8 max-w-md text-center text-charcoal/70">
          Vi har modtaget din betaling og forbereder din reparation. Du vil
          modtage en bekræftelse på email.
        </p>

        {/* Ticket ID */}
        {shortTicket && (
          <div className="mb-8 flex flex-col items-center gap-1">
            <span className="text-sm text-charcoal/60">Ticket&nbsp;ID</span>
            <div className="rounded-lg bg-white px-6 py-3 shadow-sm">
              <span className="font-mono text-lg tracking-wider text-charcoal">
                {shortTicket}
              </span>
            </div>
          </div>
        )}

        {/* Next steps */}
        <div className="mb-8 rounded-xl bg-white/60 p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-charcoal">
            Hvad sker der nu?
          </h2>
          <ol className="space-y-3 text-charcoal/80">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-eco text-sm font-bold text-white">
                1
              </span>
              <span className="pt-0.5">
                Vi bekræfter din booking på email
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-eco text-sm font-bold text-white">
                2
              </span>
              <span className="pt-0.5">
                Aflever din enhed på den valgte dato
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-eco text-sm font-bold text-white">
                3
              </span>
              <span className="pt-0.5">
                Vi reparerer og kontakter dig når den er klar
              </span>
            </li>
          </ol>
        </div>

        {/* Trust signal */}
        <div className="mb-8 flex items-center justify-center gap-2 text-green-eco">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-sm font-semibold">
            Livstidsgaranti inkluderet
          </span>
        </div>

        {/* Back to homepage */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="rounded-full bg-charcoal px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Tilbage til forsiden
          </Link>
        </div>
      </div>
    </main>
  );
}
