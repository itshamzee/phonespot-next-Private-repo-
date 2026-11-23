"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Dialog } from "@/components/admin/ui";
import { useStoreScope } from "./store-scope-context";
import { unseenEntries, WHATS_NEW, type WhatsNewEntry } from "@/lib/admin/whats-new";

const keyFor = (staffId: string) => `ps_whats_new_seen_${staffId}`;

function readSeen(staffId: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(keyFor(staffId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
}

/** Viser nye poster én gang pr. medarbejder, i én dialog. Ikke i kassen. */
export function WhatsNew() {
  const { me, loading } = useStoreScope();
  const pathname = usePathname();
  const [entries, setEntries] = useState<WhatsNewEntry[]>([]);
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  const skip = pathname.startsWith("/admin/kasse");
  const staffId = me?.id;
  const isOwner = me?.isOwner ?? false;

  useEffect(() => {
    if (loading || !staffId || skip || decided.current) return;
    decided.current = true;
    const seen = readSeen(staffId);
    if (seen === null) return;
    const unseen = unseenEntries(WHATS_NEW, seen, isOwner);
    if (unseen.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(unseen);
    setOpen(true);
  }, [loading, staffId, isOwner, skip]);

  // decided forbliver true, så en dialog, der ikke kunne gemmes, ikke åbner igen i sessionen.
  function markSeen() {
    setOpen(false);
    if (!staffId) return;
    const seen = readSeen(staffId);
    if (seen === null) return;
    try {
      const next = Array.from(new Set([...seen, ...entries.map((x) => x.id)]));
      window.localStorage.setItem(keyFor(staffId), JSON.stringify(next));
    } catch {
      // Kan det ikke gemmes, forbliver dialogen lukket resten af sessionen.
    }
  }

  if (skip || entries.length === 0) return null;
  const cta = entries[0]?.cta;

  return (
    <Dialog
      open={open}
      onClose={markSeen}
      title="Nyt i admin"
      size="md"
      footer={
        <>
          {cta && (
            <Link
              href={cta.href}
              onClick={markSeen}
              className="m-press m-tap inline-flex h-10 items-center justify-center rounded-lg bg-green-eco px-4 text-[14px] font-medium text-white transition-colors hover:bg-green-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light focus-visible:ring-offset-2"
            >
              {cta.label}
            </Link>
          )}
          <Button variant="secondary" onClick={markSeen} autoFocus>
            Forstået
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {entries.map((entry) => (
          <section key={entry.id} aria-labelledby={`wn-${entry.id}`}>
            <h3 id={`wn-${entry.id}`} className="text-[13px] font-semibold text-[#15211B]">
              {formatDate(entry.date)}
              <span className="font-normal text-[#5E6A63]"> · </span>
              {entry.title}
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-[1.5] text-[#15211B]">
              {entry.items.map((item) => (
                <li key={item.text}>
                  {item.href ? (
                    <Link href={item.href} onClick={markSeen} className="underline">
                      {item.text}
                    </Link>
                  ) : (
                    item.text
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
