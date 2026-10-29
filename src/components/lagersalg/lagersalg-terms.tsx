/** Rolig forklaring af 3 for 2 og returvilkår nederst på /lagersalg. */
export function LagersalgTerms() {
  return (
    <section aria-labelledby="lagersalg-terms-heading" className="border-t border-sand">
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-9">
        <h2 id="lagersalg-terms-heading" className="text-[18px] font-semibold text-charcoal">
          Godt at vide om lagersalget
        </h2>
        <div className="mt-4 grid gap-5 text-[14px] leading-relaxed text-charcoal/70 md:grid-cols-3 md:gap-10">
          <p>3 for 2: læg tre lagersalgsvarer i kurven, så er den billigste gratis. Gælder på tværs af modeller.</p>
          <p>Faste lave priser fra vores lager i Vejle. Varerne er nye.</p>
          <p>
            14 dages fortrydelsesret ved køb online. Lagersalgsvarer er ikke omfattet af vores 30 dages returret. I
            butikken tages lagersalgsvarer ikke retur.
          </p>
        </div>
      </div>
    </section>
  );
}
