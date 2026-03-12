"use client";

import { useState } from "react";
import Link from "next/link";

type CheckoutLegalInfoProps = {
  tcVersionId: string;
  onAccept: (accepted: boolean) => void;
};

/**
 * Pre-purchase information duties displayed at checkout.
 * Required by Forbrugeraftalelovens § 8 and E-handelsloven.
 *
 * The customer must actively accept T&C before completing the order.
 * The T&C version ID is recorded with the order.
 */
export function CheckoutLegalInfo({ tcVersionId, onAccept }: CheckoutLegalInfoProps) {
  const [accepted, setAccepted] = useState(false);

  function handleChange(checked: boolean) {
    setAccepted(checked);
    onAccept(checked);
  }

  return (
    <div className="space-y-4 rounded-xl border border-charcoal/10 bg-charcoal/[0.02] p-5">
      {/* Business info summary */}
      <div className="text-xs text-charcoal/60">
        <p><strong>PhoneSpot ApS</strong> &middot; CVR: 38688766 &middot; VestsjællandsCentret 10, 4200 Slagelse</p>
        <p>Telefon: +45 XX XX XX XX &middot; E-mail: info@phonespot.dk</p>
      </div>

      {/* Key legal summaries */}
      <div className="space-y-2 text-xs text-charcoal/70">
        <p>
          <strong>Fortrydelsesret:</strong> Du har 14 dages fortrydelsesret fra modtagelse af varen.
          Returomkostninger afholdes af dig som køber.{" "}
          <Link href="/handelsbetingelser#7" className="text-green-eco underline">Læs mere</Link>
        </p>
        <p>
          <strong>Reklamation:</strong> 24 måneders reklamationsret efter købeloven.
          PhoneSpot tilbyder desuden 36 måneders garanti.{" "}
          <Link href="/handelsbetingelser#9" className="text-green-eco underline">Læs mere</Link>
        </p>
        <p>
          <strong>Brugtmoms:</strong> Brugte enheder sælges under brugtmomsordningen.
          Køber har ikke fradragsret for moms.
        </p>
      </div>

      {/* T&C acceptance checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => handleChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-charcoal/30 text-green-eco focus:ring-green-eco"
          required
        />
        <span className="text-sm text-charcoal/80">
          Jeg har læst og accepterer PhoneSpots{" "}
          <Link href="/handelsbetingelser" target="_blank" className="text-green-eco underline">
            handelsbetingelser
          </Link>{" "}
          og{" "}
          <Link href="/privatlivspolitik" target="_blank" className="text-green-eco underline">
            persondatapolitik
          </Link>.
        </span>
      </label>

      {/* Hidden field to track T&C version */}
      <input type="hidden" name="tc_version_id" value={tcVersionId} />
    </div>
  );
}
