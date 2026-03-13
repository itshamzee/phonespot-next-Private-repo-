"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { SeoSite } from "@/lib/supabase/types";

const STORAGE_KEY = "seo-selected-site";

interface SiteSelectorProps {
  onSiteChange: (site: SeoSite | null) => void;
}

export function SiteSelector({ onSiteChange }: SiteSelectorProps) {
  const [sites, setSites] = useState<SeoSite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchSites() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("seo_sites")
        .select("*")
        .eq("is_active", true)
        .order("name");

      const siteList = (data ?? []) as SeoSite[];
      setSites(siteList);

      const saved = localStorage.getItem(STORAGE_KEY);
      const initial =
        siteList.find((s) => s.id === saved) ?? siteList[0] ?? null;
      if (initial) {
        setSelectedId(initial.id);
        onSiteChange(initial);
      }
    }
    fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectSite(site: SeoSite) {
    setSelectedId(site.id);
    localStorage.setItem(STORAGE_KEY, site.id);
    onSiteChange(site);
    setOpen(false);
  }

  const selected = sites.find((s) => s.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-stone-300 hover:bg-stone-50"
      >
        <span className="h-2 w-2 rounded-full bg-green-eco shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
        {selected?.name ?? "Vaelg site..."}
        <svg
          className="h-4 w-4 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl shadow-stone-200/40">
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => selectSite(site)}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  site.id === selectedId
                    ? "bg-green-eco/[0.07] text-green-eco"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <div className="font-medium">{site.name}</div>
                <div className="text-xs text-stone-500">{site.domain}</div>
              </button>
            ))}
            {sites.length === 0 && (
              <p className="px-4 py-3 text-sm text-stone-500">
                Ingen sites konfigureret
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
