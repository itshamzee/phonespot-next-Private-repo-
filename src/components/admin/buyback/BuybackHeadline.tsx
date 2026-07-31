"use client";

import Link from "next/link";
import type { TradeInDerivedStatus } from "@/lib/supabase/trade-in-types";

/**
 * What buyback owes and is owed today, written out.
 *
 * This replaced four counter tiles that read 0 / 0 / 0 / 60% on most days —
 * "planlagte afsendelser", "auto-sendt i dag", "acceptrate". Numbers that are
 * usually zero teach you to stop looking at the top of the page. A sentence
 * that names money and obligations, and changes every day, does not.
 *
 * The cards below it are the same rule: a card only exists when there is
 * something to do. An empty column of zeros is worse than no column.
 */

export interface HeadlineFacts {
  /** Accepted offers with no slutseddel: devices bought, not yet booked in. */
  boughtOpen: number;
  boughtOpenKr: number;
  /** Of those, how many have no return label the customer can use. */
  missingLabel: number;
  /** Untouched leads waiting in the queue. */
  newLeads: number;
  /** Offers sent whose 7-day token has run out with no answer. */
  staleOffers: number;
  /** Delivered but nobody has marked it received. */
  deliveredNotReceived: number;
  /** Receipts confirmed and waiting to be paid. */
  toPay: number;
  toPayKr: number;
}

function kr(value: number): string {
  return `${value.toLocaleString("da-DK")} kr`;
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The position, in plain Danish. Only true clauses are included. */
function buildSentence(f: HeadlineFacts): string {
  const parts: string[] = [];

  if (f.boughtOpen > 0) {
    parts.push(
      `${count(f.boughtOpen, "enhed er købt", "enheder er købt")} for ${kr(f.boughtOpenKr)} og mangler at blive registreret`,
    );
  }
  if (f.missingLabel > 0) {
    parts.push(
      `${count(f.missingLabel, "kunde", "kunder")} har sagt ja uden at få en fragtlabel`,
    );
  }
  if (f.deliveredNotReceived > 0) {
    parts.push(`${count(f.deliveredNotReceived, "pakke", "pakker")} er leveret uden at være åbnet`);
  }
  if (f.toPay > 0) {
    parts.push(`${kr(f.toPayKr)} venter på at blive udbetalt`);
  }

  if (parts.length === 0) {
    return f.newLeads > 0
      ? `Alt er registreret og betalt. ${count(f.newLeads, "ny henvendelse venter", "nye henvendelser venter")} i køen.`
      : "Alt er registreret, betalt og besvaret.";
  }

  // Sentence case, Danish "og" before the last clause.
  const sentence =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

interface Action {
  key: string;
  label: string;
  value: string;
  href: string;
  urgent?: boolean;
}

interface Props {
  facts: HeadlineFacts;
  onFilter: (status: TradeInDerivedStatus | "alle") => void;
}

export default function BuybackHeadline({ facts, onFilter }: Props) {
  const actions: Action[] = [];

  if (facts.newLeads > 0) {
    actions.push({
      key: "queue",
      label: "Nye henvendelser",
      value: String(facts.newLeads),
      href: "/admin/opkoeb/ko",
    });
  }
  if (facts.missingLabel > 0) {
    actions.push({
      key: "label",
      label: "Mangler fragtlabel",
      value: String(facts.missingLabel),
      href: "#accepteret",
      urgent: true,
    });
  }
  if (facts.deliveredNotReceived > 0) {
    actions.push({
      key: "received",
      label: "Leveret, ikke åbnet",
      value: String(facts.deliveredNotReceived),
      href: "#leveret",
      urgent: true,
    });
  }
  if (facts.toPay > 0) {
    actions.push({
      key: "pay",
      label: "Skal betales",
      value: kr(facts.toPayKr),
      href: "#vurderet",
    });
  }
  if (facts.staleOffers > 0) {
    actions.push({
      key: "stale",
      label: "Tilbud udløbet uden svar",
      value: String(facts.staleOffers),
      href: "#tilbud_sendt",
    });
  }

  return (
    <div className="mb-6">
      <p className="max-w-3xl text-[17px] leading-relaxed text-charcoal sm:text-lg">
        {buildSentence(facts)}
      </p>

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => {
            const body = (
              <>
                <span
                  className={`text-[11px] font-medium uppercase tracking-wide ${
                    action.urgent ? "text-rose-600/70" : "text-charcoal/35"
                  }`}
                >
                  {action.label}
                </span>
                <span
                  className={`mt-0.5 block text-lg font-bold tracking-tight ${
                    action.urgent ? "text-rose-700" : "text-charcoal"
                  }`}
                >
                  {action.value}
                </span>
              </>
            );

            const className = `rounded-xl border px-4 py-2.5 text-left transition-colors ${
              action.urgent
                ? "border-rose-200 bg-rose-50/60 hover:border-rose-300"
                : "border-black/[0.06] bg-white hover:border-black/15"
            }`;

            return action.href.startsWith("#") ? (
              <button
                key={action.key}
                type="button"
                onClick={() => onFilter(action.href.slice(1) as TradeInDerivedStatus)}
                className={className}
              >
                {body}
              </button>
            ) : (
              <Link key={action.key} href={action.href} className={className}>
                {body}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
