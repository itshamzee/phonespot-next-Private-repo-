import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SectionWrapper className="text-center">
      <div className="mx-auto max-w-lg">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-eco/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-green-eco">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
        </div>

        <Heading size="lg">Tak for din ordre!</Heading>

        <p className="mt-4 text-lg text-gray">
          Din ordre er modtaget og vi forbereder den til afsendelse.
          Du modtager en bekræftelsesmail med tracking-info.
        </p>

        <p className="mt-2 text-sm text-gray">
          Ordre-ID: <span className="font-mono font-semibold text-charcoal">{id}</span>
        </p>

        <div className="mt-8 rounded-2xl border border-sand bg-cream p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal">
            Hvad sker der nu?
          </h3>
          <div className="mt-4 space-y-3 text-left">
            {[
              { step: "1", text: "Du modtager en ordrebekræftelse på email" },
              { step: "2", text: "Vi kvalitetstester og klargør din enhed" },
              { step: "3", text: "Du får tracking-info når pakken sendes (1-2 hverdage)" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">
                  {item.step}
                </span>
                <p className="text-sm text-charcoal">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Fortsæt med at handle
          </Link>
          <Link
            href="/kontakt"
            className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
          >
            Kontakt os
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}
