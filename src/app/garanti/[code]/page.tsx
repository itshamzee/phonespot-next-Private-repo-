import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { createServerClient } from "@/lib/supabase/client";

export const metadata: Metadata = {
  title: "Verificer garantibevis - PhoneSpot",
  description: "Verificer dit PhoneSpot garantibevis online.",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ code: string }>;
};

export default async function WarrantyVerificationPage({ params }: Props) {
  const { code } = await params;
  const supabase = createServerClient();

  const { data: warranty } = await supabase
    .from("warranties")
    .select(`
      guarantee_number,
      issued_at,
      expires_at,
      status,
      pdf_url,
      devices (
        serial_number,
        imei,
        grade,
        storage,
        color,
        product_templates ( display_name )
      )
    `)
    .or(`guarantee_number.eq.${code},qr_verification_code.eq.${code}`)
    .single();

  if (!warranty) {
    notFound();
  }

  const device = warranty.devices as unknown as {
    serial_number: string | null;
    imei: string | null;
    grade: string;
    storage: string | null;
    color: string | null;
    product_templates: { display_name: string } | null;
  } | null;

  const isExpired = new Date(warranty.expires_at) < new Date();
  const effectiveStatus = isExpired ? "expired" : warranty.status;

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: "Aktiv", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    claimed: { label: "Benyttet", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    expired: { label: "Udløbet", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  };

  const status = statusConfig[effectiveStatus] || statusConfig.expired;

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl">
        <Heading size="lg">Garantibevis</Heading>

        <div className={`mt-8 rounded-xl border p-4 ${status.bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal/60">Status</span>
            <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-charcoal/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-charcoal">
            {warranty.guarantee_number}
          </h2>

          <div className="mt-6 space-y-3">
            {device?.product_templates?.display_name && (
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/60">Model</span>
                <span className="font-medium text-charcoal">{device.product_templates.display_name}</span>
              </div>
            )}
            {device?.serial_number && (
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/60">Serienummer</span>
                <span className="font-medium text-charcoal">{device.serial_number}</span>
              </div>
            )}
            {device?.imei && (
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/60">IMEI</span>
                <span className="font-medium text-charcoal">{device.imei}</span>
              </div>
            )}
            {device?.grade && (
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/60">Stand</span>
                <span className="font-medium text-charcoal">
                  {device.grade === "A" ? "A — Perfekt stand" : device.grade === "B" ? "B — Let brugt" : "C — Synlig slitage"}
                </span>
              </div>
            )}
            {device?.storage && (
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/60">Lagerplads</span>
                <span className="font-medium text-charcoal">{device.storage}</span>
              </div>
            )}

            <div className="mt-4 border-t border-charcoal/5 pt-4" />

            <div className="flex justify-between text-sm">
              <span className="text-charcoal/60">Udstedt</span>
              <span className="font-medium text-charcoal">
                {new Date(warranty.issued_at).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal/60">Udløber</span>
              <span className="font-medium text-charcoal">
                {new Date(warranty.expires_at).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal/60">Garantiperiode</span>
              <span className="font-medium text-charcoal">36 måneder</span>
            </div>
          </div>
        </div>

        {warranty.pdf_url && (
          <a
            href={warranty.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full rounded-full bg-charcoal px-6 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Download garantibevis (PDF)
          </a>
        )}

        <div className="mt-6 rounded-xl border border-charcoal/5 bg-charcoal/[0.02] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-charcoal/40">
            Reklamation
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-charcoal/60">
            Kontakt os på{" "}
            <a href="mailto:info@phonespot.dk" className="text-green-eco underline">
              info@phonespot.dk
            </a>{" "}
            eller besøg en af vores butikker med dette garantibevis og enheden.
            Du har altid 24 måneders reklamationsret efter købeloven, uafhængigt
            af denne garanti.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
