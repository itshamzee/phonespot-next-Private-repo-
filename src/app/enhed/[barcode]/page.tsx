import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = { params: Promise<{ barcode: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { barcode } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("devices")
    .select("product_templates ( display_name )")
    .eq("barcode", barcode)
    .single();

  const name = (data?.product_templates as { display_name: string } | null)?.display_name ?? "Enhed";
  return {
    title: `${name} — Enhedshistorik | PhoneSpot`,
    description: `Se kvalitetsoplysninger, batterikapacitet og grading for denne enhed.`,
  };
}

const GRADE_INFO: Record<string, { label: string; color: string; description: string }> = {
  A: {
    label: "Grade A — Perfekt stand",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Ingen synlige ridser eller skader. Skarm og krop i perfekt stand.",
  },
  B: {
    label: "Grade B — Let brugt",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Lette kosmetiske brugsspor. Skaerm i god stand, mulige lette ridser pa krop.",
  },
  C: {
    label: "Grade C — Tydeligt brugt",
    color: "bg-red-100 text-red-800 border-red-200",
    description: "Tydelige brugsspor, ridser eller sma skader. Fuld funktionalitet.",
  },
};

export default async function DeviceHistoryPage({ params }: PageProps) {
  const { barcode } = await params;
  const supabase = createAdminClient();

  const { data: device, error } = await supabase
    .from("devices")
    .select(`
      id, barcode, grade, battery_health, storage, color, condition_notes,
      photos, origin_country, created_at, listed_at,
      product_templates ( display_name, brand, model, category )
    `)
    .eq("barcode", barcode)
    .single();

  if (error || !device) {
    notFound();
  }

  const template = device.product_templates as {
    display_name: string;
    brand: string;
    model: string;
    category: string;
  } | null;

  const gradeInfo = GRADE_INFO[device.grade] ?? GRADE_INFO.B;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-600">
          PhoneSpot Enhedshistorik
        </p>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">
          {template?.display_name ?? "Enhed"}
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Stregkode: {device.barcode}
        </p>
      </div>

      <div className="space-y-6">
        {/* Grade */}
        <div className={`rounded-xl border p-5 ${gradeInfo.color}`}>
          <h2 className="text-lg font-bold">{gradeInfo.label}</h2>
          <p className="mt-1 text-sm">{gradeInfo.description}</p>
        </div>

        {/* Specifications */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
            Specifikationer
          </h2>
          <dl className="space-y-3">
            {template?.brand && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Maerke</dt>
                <dd className="text-sm font-medium text-stone-800">{template.brand}</dd>
              </div>
            )}
            {template?.model && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Model</dt>
                <dd className="text-sm font-medium text-stone-800">{template.model}</dd>
              </div>
            )}
            {device.storage && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Lager</dt>
                <dd className="text-sm font-medium text-stone-800">{device.storage}</dd>
              </div>
            )}
            {device.color && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Farve</dt>
                <dd className="text-sm font-medium text-stone-800">{device.color}</dd>
              </div>
            )}
            {device.origin_country && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Oprindelsesland</dt>
                <dd className="text-sm font-medium text-stone-800">{device.origin_country}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Battery Health */}
        {device.battery_health !== null && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Batterikapacitet
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full ${
                    device.battery_health >= 80 ? "bg-green-500" : device.battery_health >= 60 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, device.battery_health)}%` }}
                />
              </div>
              <span className="text-lg font-bold text-stone-800">{device.battery_health}%</span>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Batterikapacitet i forhold til nyt batteri. Over 80% betragtes som godt.
            </p>
          </div>
        )}

        {/* Condition notes */}
        {device.condition_notes && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Tilstandsbemaerkninger
            </h2>
            <p className="text-sm text-stone-700 whitespace-pre-line">{device.condition_notes}</p>
          </div>
        )}

        {/* Test info */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
            Kvalitetskontrol
          </h2>
          <p className="text-sm text-stone-700">
            Denne enhed er testet og kvalitetsgodkendt af PhoneSpot.
            Alle enheder gennemgar en grundig funktionstest, batterikontrol og
            kosmetisk vurdering for de saeettes til salg.
          </p>
          {device.listed_at && (
            <p className="mt-2 text-xs text-stone-500">
              Testet: {new Date(device.listed_at).toLocaleDateString("da-DK", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Warranty info */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-green-800">
            36 maneders garanti
          </h2>
          <p className="text-sm text-green-700">
            Alle enheder fra PhoneSpot leveres med 36 maneders garanti.
            Hertil kommer 24 maneders lovmaessig reklamationsret.
          </p>
        </div>

        {/* PhoneSpot footer */}
        <div className="text-center">
          <p className="text-xs text-stone-400">
            PhoneSpot · Refurbished elektronik med garanti · phonespot.dk
          </p>
        </div>
      </div>
    </div>
  );
}
