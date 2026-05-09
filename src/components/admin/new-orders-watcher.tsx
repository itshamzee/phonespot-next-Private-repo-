"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

/**
 * Polls /api/orders/recent every 30s, shows a toast + plays a chime
 * for each new order. Persists "last seen" timestamp in localStorage so
 * a refresh doesn't replay old orders. Mounts once in the admin layout.
 */

type RecentOrder = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  type: string;
  total: number;
  created_at: string;
  customer: { name: string | null } | null;
};

const STORAGE_KEY = "phonespot_admin_last_seen_order";
const POLL_MS = 30_000;
const TOAST_DURATION_MS = 9_000;

export default function NewOrdersWatcher() {
  const [toasts, setToasts] = useState<RecentOrder[]>([]);
  const supabase = createBrowserClient();
  const lastSeenRef = useRef<string>(initialSince());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          schedule();
          return;
        }

        const res = await fetch(
          `/api/orders/recent?since=${encodeURIComponent(lastSeenRef.current)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (!res.ok) {
          schedule();
          return;
        }

        const { orders } = (await res.json()) as { orders: RecentOrder[] };
        if (cancelled) return;

        // First poll after mount: don't toast historical orders, just
        // bring lastSeen up to "now". Without this, a freshly-loaded
        // tab spams you with 5-minute-old orders.
        if (!initializedRef.current) {
          initializedRef.current = true;
          if (orders.length > 0) {
            lastSeenRef.current = orders[0].created_at;
            persistLastSeen(orders[0].created_at);
          }
          schedule();
          return;
        }

        if (orders.length > 0) {
          // Newest first from API; reverse so oldest is shown first
          const newOnes = orders.slice().reverse();
          for (const o of newOnes) {
            queueToast(o);
            playChime();
          }
          lastSeenRef.current = orders[0].created_at;
          persistLastSeen(orders[0].created_at);
        }
      } catch {
        // network blip — quietly retry on next tick
      }
      schedule();
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(poll, POLL_MS);
    }

    function queueToast(o: RecentOrder) {
      setToasts((prev) => [...prev, o]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== o.id));
      }, TOAST_DURATION_MS);
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playChime() {
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      // Two-note ping: E5 then A5
      playNote(ctx, 659.25, ctx.currentTime, 0.18);
      playNote(ctx, 880, ctx.currentTime + 0.14, 0.22);
    } catch {
      // browser may block before user gesture — that's fine
    }
  }

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((o) => (
        <Link
          key={o.id}
          href={`/admin/platform/orders/${o.id}`}
          onClick={() => dismiss(o.id)}
          className="pointer-events-auto group relative overflow-hidden rounded-xl border border-emerald-500/15 bg-white p-3.5 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          {/* Accent bar */}
          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
          <div className="ml-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Ny ordre
                </span>
                {o.type && o.type !== "online" && (
                  <span className="rounded-full bg-charcoal/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-charcoal/50">
                    {o.type}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm font-bold text-charcoal">
                #{o.order_number ?? o.id.slice(0, 8)}
                {o.customer?.name && (
                  <span className="font-medium text-charcoal/55">
                    {" "}
                    · {o.customer.name}
                  </span>
                )}
              </p>
              <p className="text-xs text-charcoal/45">
                {formatOere(o.total)} · {timeAgo(o.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss(o.id);
              }}
              className="shrink-0 rounded-md p-1 text-charcoal/30 transition hover:bg-charcoal/5 hover:text-charcoal/60"
              aria-label="Luk"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── helpers ───────────────────────────────────────────────────── */

function initialSince(): string {
  if (typeof window === "undefined") {
    return new Date(Date.now() - 5 * 60 * 1000).toISOString();
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  return new Date(Date.now() - 5 * 60 * 1000).toISOString();
}

function persistLastSeen(iso: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    // quota / private mode — non-fatal
  }
}

function playNote(ctx: AudioContext, freq: number, when: number, dur: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // Gentle bell envelope: quick attack, slow tail
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.18, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "lige nu";
  const min = Math.floor(sec / 60);
  if (min < 60) return `for ${min} min siden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `for ${hr} t. siden`;
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}
