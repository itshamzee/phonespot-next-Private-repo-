import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { staleCutoff } from "@/lib/admin/overview/web-bookings";
import {
  applyLocationScope,
  applyStoreScope,
  loadLocationIndex,
  requireStaffScope,
  unauthorizedResponse,
} from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/nav-counts — tallene i sidemenuen og notifikationerne, afgrænset til
 * personalets butik. `repairs` er åbne sager; `newRepairs` er sager, der ikke er modtaget endnu;
 * `webBookings` er de af dem, der kom fra hjemmesidens booking. `latestWebBooking` er den nyeste
 * af dem, så admin kan vise en besked, når en ny lander.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { scope } = ctx;

  const supabase = createServerClient();
  const index = await loadLocationIndex();
  const head = { count: "exact", head: true } as const;
  // Samme grænse som Overblik: en booking hvis dag er over 14 dage gammel er glemt, ikke ny.
  const cutoff = staleCutoff(copenhagenDateString());
  const recent = `booking_details->>preferred_date.gte.${cutoff},and(booking_details->>preferred_date.is.null,created_at.gte.${cutoff})`;

  const [orders, repairs, newRepairs, webBookings, latest, inquiries, buyback] = await Promise.all([
    applyLocationScope(supabase.from("orders").select("id", head).eq("status", "pending").eq("type", "online"), scope, index),
    // Menu-tallet er åbne sager (alt undtagen afhentet og løst reklamation)
    applyStoreScope(
      supabase.from("repair_tickets").select("id", head).not("status", "in", "(afhentet,reklamation_loest)"),
      scope,
    ),
    applyStoreScope(supabase.from("repair_tickets").select("id", head).eq("status", "modtaget"), scope),
    applyStoreScope(
      supabase
        .from("repair_tickets")
        .select("id", head)
        .eq("status", "modtaget")
        .not("booking_details", "is", null)
        .or(recent),
      scope,
    ),
    applyStoreScope(
      supabase
        .from("repair_tickets")
        .select("id, device_model, store_id, created_at, booking_details")
        .eq("status", "modtaget")
        .not("booking_details", "is", null),
      scope,
    )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    applyStoreScope(
      supabase.from("contact_inquiries").select("id", head).eq("status", "ny").neq("source", "saelg-enhed"),
      scope,
    ),
    applyStoreScope(
      supabase.from("contact_inquiries").select("id", head).eq("status", "ny").eq("source", "saelg-enhed"),
      scope,
    ),
  ]);

  return NextResponse.json(
    {
      orders: orders.count ?? 0,
      repairs: repairs.count ?? 0,
      newRepairs: newRepairs.count ?? 0,
      webBookings: webBookings.count ?? 0,
      latestWebBooking: latest.data
        ? {
            id: latest.data.id as string,
            device: (latest.data.device_model as string | null) ?? null,
            store: (latest.data.store_id as string | null) ?? null,
            date: (latest.data.booking_details as { preferred_date?: string | null } | null)?.preferred_date ?? null,
            time: (latest.data.booking_details as { preferred_time?: string | null } | null)?.preferred_time ?? null,
            createdAt: latest.data.created_at as string,
          }
        : null,
      inquiries: inquiries.count ?? 0,
      buyback: buyback.count ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
