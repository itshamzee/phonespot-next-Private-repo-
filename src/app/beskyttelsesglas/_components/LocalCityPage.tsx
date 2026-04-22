import Image from "next/image";
import { BrandGrid } from "./BrandGrid";
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
    <main>
      <JsonLd data={schema} />

      <section className="relative min-h-[55vh] flex items-center bg-[#0a0a0a] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <Image src={heroImage} alt={`${store.name} butik`} fill className="object-cover" priority />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-semibold">Beskyttelsesglas i {store.city}</h1>
          <p className="mt-4 text-lg text-white/80">Gratis montering på stedet · mens du venter · 60 sekunder</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 space-y-6 text-gray-700">
        <p>
          Kom forbi PhoneSpot {store.city} — vi har beskyttelsesglas til alle de populære iPhone-, Samsung-, iPad-, Pixel-, Xiaomi-
          og OnePlus-modeller. Vælg dit glas i butikken eller bestil online og afhent samme dag. Vi monterer det gratis,
          perfekt hver gang, på under et minut.
        </p>
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
        <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
          <iframe src={store.googleMapsEmbed} loading="lazy" className="w-full h-full border-0" title={`${store.name} kort`} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 border-t border-gray-100">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-10">Vælg din telefon</h2>
        <BrandGrid />
      </section>
    </main>
  );
}
