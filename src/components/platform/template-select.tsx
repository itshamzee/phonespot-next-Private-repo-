"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Template {
  id: string;
  brand: string;
  model: string;
  category: string;
  display_name: string;
  storage_options: string[];
  colors: string[];
}

interface TemplateSelectProps {
  value: string | null;
  onChange: (
    id: string,
    template: {
      brand: string;
      model: string;
      display_name: string;
      storage_options: string[];
      colors: string[];
    }
  ) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function TemplateSelect({ value, onChange }: TemplateSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Fetch templates when search changes or dropdown opens
  const fetchTemplates = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/platform/templates?search=${encodeURIComponent(q)}`
        : `/api/platform/templates`;
      const res = await fetch(url);
      if (res.ok) {
        const data: Template[] = await res.json();
        setTemplates(data);
      }
    } catch {
      // silently fail — empty list shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates(debouncedSearch);
    }
  }, [open, debouncedSearch, fetchTemplates]);

  // Resolve selected template label when value changes externally
  useEffect(() => {
    if (!value) {
      setSelectedTemplate(null);
      return;
    }
    // If already in list, use it
    const found = templates.find((t) => t.id === value);
    if (found) {
      setSelectedTemplate(found);
    }
  }, [value, templates]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleOpen() {
    setOpen(true);
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function handleSelect(template: Template) {
    setSelectedTemplate(template);
    setOpen(false);
    onChange(template.id, {
      brand: template.brand,
      model: template.model,
      display_name: template.display_name,
      storage_options: template.storage_options,
      colors: template.colors,
    });
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-700 transition hover:border-stone-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-eco/40"
      >
        <span className={selectedTemplate ? "text-stone-800" : "text-stone-400"}>
          {selectedTemplate ? selectedTemplate.display_name : "Vælg skabelon…"}
        </span>
        <svg
          className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          {/* Search box */}
          <div className="border-b border-stone-100 px-3 py-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg brand, model…"
              className="w-full rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
            />
          </div>

          {/* Results */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <li className="px-4 py-3 text-sm text-stone-400">Indlæser…</li>
            ) : templates.length === 0 ? (
              <li className="px-4 py-3 text-sm text-stone-400">Ingen resultater</li>
            ) : (
              templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={[
                      "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition hover:bg-stone-50",
                      value === t.id ? "bg-green-eco/5" : "",
                    ].join(" ")}
                  >
                    <span className="text-sm font-medium text-stone-800">
                      {t.display_name}
                    </span>
                    <span className="text-xs text-stone-400">
                      {t.brand} · {t.model} · {t.category}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
