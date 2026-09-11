import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import type { StoreLocationConfig } from "@/lib/store-config";

export function LocalCityPage({ store, heroImage }: { store: StoreLocationConfig; heroImage: string }) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.street,
      addressLocality: store.city,
      postalCode: store.zip,
      addressCountry: store.countryCode,
    },
    telephone: store.phone,
    email: store.email,
    openingHours: `Mo-Fr ${store.hours.weekdays}, Sa ${store.hours.saturday}, Su ${store.hours.sunday}`,
    geo: { "@type": "GeoCoordinates", latitude: store.coordinates.lat, longitude: store.coordinates.lng },
  };

  return (
    <div className="font-body text-charcoal">
      <JsonLd data={schema} />

      <section className="border-b border-sand bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-7 px-5 py-8 sm:px-9 lg:grid-cols-2 lg:items-center">
          <div><p className="text-xs font-semibold text-[#1A3D2E]">PhoneSpot {store.city}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Beskyttelsesglas i {store.city}</h1><p className="mt-4 text-sm leading-6 text-charcoal/65">Vi hjælper dig med at finde glas til din model. Gratis montering ved køb af beskyttelsesglas hos os.</p><Link href="/beskyttelsesglas" className="mt-5 inline-flex rounded-lg bg-[#1A3D2E] px-5 py-3 text-sm font-semibold text-white">Find glas til din model</Link></div>
          <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#f4f5f2]"><Image src={heroImage} alt="Spot beskyttelsesglas" fill className="object-contain p-6" priority sizes="(min-width:1024px) 50vw,100vw"/></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-10 sm:px-9 space-y-6 text-gray-700">
        <p>Besøg PhoneSpot {store.city}, hvis du vil have hjælp med valg og montering. Se modeludvalget online, eller kontakt butikken om tilgængelighed.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="font-semibold mb-1">Adresse</div>
            <div>{store.street}</div>
            <div>{store.zip} {store.city}</div>
            {store.mall && <div className="text-gray-500 mt-1">{store.mall}</div>}
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="font-semibold mb-1">Åbningstider</div>
            <div>Hverdage: {store.hours.weekdays}</div>
            <div>Lørdag: {store.hours.saturday}</div>
            <div>Søndag: {store.hours.sunday}</div>
          </div>
        </div>
        <div className="h-[300px] rounded-xl overflow-hidden border border-gray-200">
          <iframe src={store.googleMapsEmbed} loading="lazy" className="w-full h-full border-0" title={`${store.name} kort`} />
        </div>
      </section>


    </div>
  );
}
