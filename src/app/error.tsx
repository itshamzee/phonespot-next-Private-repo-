"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-white px-4">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-8 w-8 text-red-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-[#111111]">
          Noget gik galt
        </h1>
        <p className="mt-4 text-lg text-[#6E6E73]">
          Vi beklager ulejligheden. Pr&oslash;v at genindl&aelig;se siden eller kontakt os
          hvis problemet forts&aelig;tter.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-[#1A3D2E] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
          >
            Pr&oslash;v igen
          </button>
          <a
            href="/"
            className="rounded-full border-2 border-[#E5E5EA] px-8 py-3.5 text-sm font-bold text-[#111111] transition-colors hover:border-[#111111]"
          >
            G&aring; til forsiden
          </a>
        </div>
        <p className="mt-8 text-xs text-[#6E6E73]">
          Kontakt os p&aring;{" "}
          <a href="mailto:info@phonespot.dk" className="font-semibold text-[#1A3D2E] hover:underline">
            info@phonespot.dk
          </a>{" "}
          eller ring{" "}
          <a href="tel:+4561100048" className="font-semibold text-[#1A3D2E] hover:underline">
            61 10 00 48
          </a>
        </p>
      </div>
    </section>
  );
}
