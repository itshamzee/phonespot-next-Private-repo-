"use client";

import { useState } from "react";

type Props = {
  token: string;
  orderNumber: string;
};

export function WithdrawalForm({ token, orderNumber }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Din fortrydelse er registreret. Du modtager en bekræftelse på e-mail.");
      } else {
        setStatus("error");
        setMessage(data.error || "Der opstod en fejl. Prøv venligst igen.");
      }
    } catch {
      setStatus("error");
      setMessage("Der opstod en fejl. Kontakt os på info@phonespot.dk.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 rounded-xl border border-green-eco/20 bg-green-eco/5 p-6">
        <h3 className="font-display text-base font-bold text-charcoal">
          Fortrydelse registreret
        </h3>
        <p className="mt-2 text-sm text-charcoal/80">{message}</p>
        <p className="mt-2 text-sm text-charcoal/60">
          Ordre #{orderNumber}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-charcoal">
          Begrundelse (valgfri)
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Du behøver ikke angive en grund, men det hjælper os med at forbedre vores service."
          className="mt-1 w-full rounded-xl border border-charcoal/20 px-4 py-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600">{message}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-charcoal px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "Behandler..." : "Fortryd mit køb"}
      </button>
    </form>
  );
}
