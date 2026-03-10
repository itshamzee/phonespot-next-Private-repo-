"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type PageState = "loading" | "form" | "success" | "error";

export default function AfvisPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState("error"); setErrorMsg("Ugyldigt link."); return; }

    fetch(`/api/trade-in/offer-status?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setErrorMsg(data.message || "Ugyldigt link.");
          setState("error");
          return;
        }
        setState("form");
      })
      .catch(() => { setState("error"); setErrorMsg("Kunne ikke indlæse tilbud."); });
  }, [token]);

  async function handleReject() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade-in/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, customer_response_note: comment || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Kunne ikke afvise tilbud");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-eco border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud ikke tilgængeligt</h1>
          <p className="mt-4 text-gray">{errorMsg}</p>
          <p className="mt-6 text-sm text-gray">
            Kontakt os på <a href="mailto:ha@phonespot.dk" className="text-green-eco underline">ha@phonespot.dk</a> for hjælp.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-soft-grey bg-white p-10">
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud afvist</h1>
          <p className="mt-4 text-gray">
            Vi har registreret dit svar. Hvis du ændrer mening eller ønsker et nyt tilbud,
            er du velkommen til at kontakte os.
          </p>
          <a
            href="mailto:ha@phonespot.dk"
            className="mt-6 inline-block text-sm font-medium text-green-eco underline"
          >
            Kontakt os
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-soft-grey bg-white p-8">
        <h1 className="font-display text-2xl font-bold text-charcoal">Afvis tilbud</h1>
        <p className="mt-2 text-gray">
          Er du sikker på du vil afvise tilbuddet? Du kan evt. skrive en kommentar,
          så kan vi måske finde en bedre løsning.
        </p>

        <textarea
          placeholder="Valgfri kommentar — f.eks. 'Prisen er for lav' eller 'Jeg har fundet en bedre pris'"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-6 w-full rounded-xl border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all"
        />

        <div className="mt-6 flex gap-3">
          <a
            href="/"
            className="flex-1 rounded-xl border border-soft-grey bg-white px-4 py-3 text-center text-sm font-bold text-charcoal transition-colors hover:bg-sand"
          >
            Annuller
          </a>
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50"
          >
            {submitting ? "Sender..." : "Afvis tilbud"}
          </button>
        </div>
      </div>
    </div>
  );
}
