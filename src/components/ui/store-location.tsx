import { FadeIn } from "@/components/ui/fade-in";
import { STORE } from "@/lib/store-config";

type StoreLocationProps = {
  variant?: "full" | "compact";
};

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
      />
    </svg>
  );
}

function CompactStoreLocation() {
  return (
    <div className="flex items-center gap-1.5">
      <MapPinIcon className="h-4 w-4 text-green-eco" />
      <span className="text-xs font-medium text-charcoal">
        Besøg os i {STORE.mall}
      </span>
    </div>
  );
}

function FullStoreLocation() {
  return (
    <FadeIn>
      <div className="rounded-2xl border border-sand bg-cream/50 p-6 md:p-8">
        <div className="flex gap-5">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-eco/10">
            <StorefrontIcon className="h-6 w-6 text-green-eco" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-charcoal">
              Besøg vores butik
            </h3>
            <p className="mt-1 text-sm text-gray">
              Vi har en fysisk butik i {STORE.mall}, hvor du er velkommen
              til at kigge forbi og se vores udvalg.
            </p>

            {/* Two-column grid */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* Address */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[1px] text-charcoal/60">
                  Adresse
                </p>
                <p className="mt-1 text-sm text-charcoal">
                  {STORE.mall}
                </p>
                <p className="text-sm text-charcoal">{STORE.street}</p>
                <p className="text-sm text-charcoal">
                  {STORE.zip} {STORE.city}
                </p>
              </div>

              {/* Hours */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[1px] text-charcoal/60">
                  Åbningstider
                </p>
                <div className="mt-1 space-y-0.5 text-sm text-charcoal">
                  <p>
                    <span className="text-gray">Man–Fre:</span>{" "}
                    {STORE.hours.weekdays}
                  </p>
                  <p>
                    <span className="text-gray">Lørdag:</span>{" "}
                    {STORE.hours.saturday}
                  </p>
                  <p>
                    <span className="text-gray">Søndag:</span>{" "}
                    {STORE.hours.sunday}
                  </p>
                </div>
              </div>
            </div>

            {/* Google Maps link */}
            {STORE.googleMapsUrl && (
              <a
                href={STORE.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-eco hover:underline"
              >
                <MapPinIcon className="h-4 w-4" />
                Se på Google Maps &rarr;
              </a>
            )}
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

export function StoreLocation({ variant = "full" }: StoreLocationProps) {
  if (variant === "compact") {
    return <CompactStoreLocation />;
  }
  return <FullStoreLocation />;
}
