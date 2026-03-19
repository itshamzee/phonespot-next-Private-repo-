"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type WarrantyData = {
  id: string;
  guarantee_number: string;
  status: string;
  pdf_url: string | null;
  issued_at: string;
  expires_at: string;
  qr_verification_code: string | null;
  devices: { product_templates: { display_name: string } | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  claimed: "Benyttet",
  expired: "Udlobet",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  claimed: "bg-amber-100 text-amber-700",
  expired: "bg-[#F7F7F8] text-[#6E6E73]",
};

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<WarrantyData[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/customer", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWarranties(data.warranties ?? []);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-[#6E6E73]">Indlaeser garantier...</div>;
  }

  if (warranties.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[#6E6E73]">Du har ingen garantibeviser endnu</p>
        <p className="mt-2 text-xs text-[#6E6E73]">
          Garantibeviser udstedes automatisk ved kob af enheder.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {warranties.map((w) => {
        const deviceName =
          (w.devices as any)?.product_templates?.display_name ?? "Enhed";
        const isExpired = new Date(w.expires_at) < new Date();
        const effectiveStatus = isExpired ? "expired" : w.status;

        return (
          <div key={w.id} className="rounded-xl border border-[#E5E5EA] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#111111]">{w.guarantee_number}</p>
                <p className="mt-1 text-sm text-[#6E6E73]">{deviceName}</p>
                <div className="mt-2 flex gap-4 text-xs text-[#6E6E73]">
                  <span>Udstedt: {new Date(w.issued_at).toLocaleDateString("da-DK")}</span>
                  <span>Udlober: {new Date(w.expires_at).toLocaleDateString("da-DK")}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[effectiveStatus] ?? "bg-[#F7F7F8] text-[#6E6E73]"}`}>
                  {STATUS_LABELS[effectiveStatus] ?? effectiveStatus}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {w.pdf_url && (
                <a
                  href={w.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#6E6E73] hover:bg-[#F7F7F8]"
                >
                  Download PDF
                </a>
              )}
              {w.qr_verification_code && (
                <a
                  href={`/garanti/${w.qr_verification_code}`}
                  className="rounded-lg border border-[#E5E5EA] px-3 py-1.5 text-xs font-medium text-[#1A3D2E] hover:bg-[#EFF5F1]"
                >
                  Verificer garanti
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
