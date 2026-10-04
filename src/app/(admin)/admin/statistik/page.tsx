import type { Metadata } from "next";
import EcommerceDashboard from "@/components/admin/dashboard/ecommerce-dashboard";

export const metadata: Metadata = { title: "Statistik" };

/** Statistik: webshoppens salgs- og trafiktal (det gamle dashboard), nu som egen side. */
export default function StatistikPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-[#15211B] sm:text-[32px]">Statistik</h1>
      <EcommerceDashboard />
    </div>
  );
}
