"use client";

import { useState, useEffect } from "react";

export function NewsletterPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("newsletter-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < sevenDays) return;
    }

    const timer = setTimeout(() => setVisible(true), 30000);

    function handleScroll() {
      const scrollPercent =
        window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrollPercent > 0.5) {
        setVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    }

    window.addEventListener("scroll", handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function dismiss() {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
    setVisible(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email") as string;
    // Store for later Klaviyo integration
    console.log("Newsletter signup:", email);
    dismiss();
  }

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={dismiss}
        aria-hidden="true"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 text-gray hover:text-charcoal"
          aria-label="Luk"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h2 className="font-display text-2xl font-bold uppercase text-charcoal">
          Få eksklusive tilbud
        </h2>
        <p className="mt-2 text-sm text-charcoal/70">
          Tilmeld dig vores nyhedsbrev og vær den første til at høre om nye
          produkter og tilbud.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Din email"
            className="flex-1 rounded-full border border-soft-grey px-4 py-2.5 text-sm text-charcoal focus:border-green-eco focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-green-eco px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Tilmeld
          </button>
        </form>
      </div>
    </>
  );
}
