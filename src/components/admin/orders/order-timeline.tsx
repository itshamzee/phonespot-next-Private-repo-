"use client";

import { formatDate } from "@/lib/platform/format";

interface Order {
  id: string;
  created_at: string;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
}

interface TimelineEvent {
  date: string;
  label: string;
}

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const events: TimelineEvent[] = [
    { date: order.created_at, label: "Ordre oprettet" },
    { date: order.confirmed_at ?? "", label: "Bekræftet" },
    { date: order.shipped_at ?? "", label: "Afsendt" },
    { date: order.delivered_at ?? "", label: "Leveret" },
  ].filter((e) => Boolean(e.date));

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-white border border-stone-200 p-5">
      <h2 className="text-sm font-semibold text-stone-700 mb-4">Tidslinje</h2>
      <ol className="relative space-y-0">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          return (
            <li key={index} className="relative flex gap-3 pb-6 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className="absolute left-[7px] top-4 bottom-0 w-px bg-stone-200"
                  aria-hidden="true"
                />
              )}
              {/* Dot */}
              <div className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-green-600 bg-white" />
              {/* Content */}
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-stone-800">{event.label}</p>
                <p className="text-xs text-stone-500">{formatDate(event.date)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
