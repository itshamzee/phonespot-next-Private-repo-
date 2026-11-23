import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { DETAIL_FIELDS, buildTicketPatch } from "@/lib/repairs/patch";
import { applyStoreScope, forbiddenResponse } from "@/lib/auth/store-scope-server";
import { canAccessStore, getStoreScope } from "@/lib/auth/store-scope";

// Stien er ikke dækket af middleware-matcheren, så personale-tjekket ligger her.
// (/api/repairs/[id]/public er bevidst offentlig og røres ikke.)

type Before = Record<string, string | null> & { customer_id: string | null; device_id: string | null };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await requireStaff(request);
  if (!staff) {
    return NextResponse.json({ error: "Log ind som personale for at ændre sagen." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  const { patch, error, serialNumber, updateCustomer } = buildTicketPatch(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  // Butiksafgrænsning: man må ikke flytte en sag til en butik man ikke selv hører til ...
  if (typeof patch.store_id !== "undefined" && !canAccessStore(staff, patch.store_id as string | null)) {
    return forbiddenResponse("Du kan kun knytte sager til din egen butik.");
  }

  const supabase = createServerClient();
  const scope = getStoreScope(staff);
  const detailKeys = Object.keys(DETAIL_FIELDS).filter((k) => k in patch);
  const editsDetails = detailKeys.length > 0 || serialNumber !== undefined;

  // Ved rettelse af kunde/enhed hentes de gamle værdier først, så historikken kan
  // vise hvad der stod før. Samme butiksfilter, så en fremmed sag giver 404.
  let before: Before | null = null;
  let oldSerial: string | null = null;
  if (editsDetails) {
    const { data: row, error: readError } = await applyStoreScope(
      supabase
        .from("repair_tickets")
        .select(`customer_id, device_id, ${Object.keys(DETAIL_FIELDS).join(", ")}`)
        .eq("id", id),
      scope,
    ).maybeSingle();
    if (readError) {
      console.error("[repairs] read before patch failed:", id, readError);
      return NextResponse.json({ error: "Kunne ikke opdatere sagen" }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });
    before = row as unknown as Before;

    if (serialNumber !== undefined) {
      if (!before.device_id) {
        return NextResponse.json(
          { error: "Sagen har ingen enhed tilknyttet, så IMEI / serienummer kan ikke gemmes." },
          { status: 400 },
        );
      }
      const { data: dev } = await supabase
        .from("customer_devices")
        .select("serial_number")
        .eq("id", before.device_id)
        .maybeSingle();
      oldSerial = (dev as { serial_number: string | null } | null)?.serial_number ?? null;
    }
  }

  // ... og man kan kun ændre sager i sin egen butik (ejeren: alle). Filteret ligger i
  // selve UPDATE'en, så en sag i en anden butik giver 404 uden et ekstra opslag.
  const { data, error: updateError } = await applyStoreScope(
    supabase
      .from("repair_tickets")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id),
    scope,
  )
    .select("id, is_urgent, on_hold_reason, store_id")
    .maybeSingle();

  if (updateError) {
    console.error("[repairs] patch failed:", id, updateError);
    return NextResponse.json({ error: "Kunne ikke opdatere sagen" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });

  if (!before) return NextResponse.json({ success: true, ticket: data });

  const warnings: string[] = [];

  if (serialNumber !== undefined && serialNumber !== oldSerial && before.device_id) {
    const { error: devError } = await supabase
      .from("customer_devices")
      .update({ serial_number: serialNumber })
      .eq("id", before.device_id);
    if (devError) {
      console.error("[repairs] serial update failed:", id, devError);
      warnings.push("IMEI / serienummer blev ikke gemt. Prøv igen.");
    }
  }

  // Kundekortet: kun når personalet beder om det, og kun felter der findes der.
  const customerFields: Record<string, string | null> = {};
  if ("customer_name" in patch) customerFields.name = patch.customer_name as string;
  if ("customer_phone" in patch) customerFields.phone = patch.customer_phone as string;
  if ("customer_email" in patch) customerFields.email = (patch.customer_email as string) || null;
  if (updateCustomer && before.customer_id && Object.keys(customerFields).length > 0) {
    const { error: custError } = await supabase.from("customers").update(customerFields).eq("id", before.customer_id);
    if (custError) {
      console.error("[repairs] customer update failed:", id, custError);
      warnings.push("Sagen er rettet, men kundekortet blev ikke opdateret.");
    }
  }

  // Historik: hvad blev ændret, fra hvad til hvad.
  const changes: { field: string; label: string; from: string; to: string }[] = [];
  for (const key of detailKeys) {
    const from = (before[key] ?? "").toString();
    const to = (patch[key] ?? "").toString();
    if (from !== to) changes.push({ field: key, label: DETAIL_FIELDS[key].label, from, to });
  }
  if (serialNumber !== undefined && (oldSerial ?? "") !== (serialNumber ?? "")) {
    changes.push({ field: "serial_number", label: "IMEI / serienr.", from: oldSerial ?? "", to: serialNumber ?? "" });
  }
  if (changes.length > 0) {
    const { error: logError } = await supabase.from("activity_log").insert({
      actor_id: staff.id,
      actor_type: "staff",
      action: "repair_case_details_changed",
      entity_type: "repair_ticket",
      entity_id: id,
      details: { changes, customer_card_updated: Boolean(updateCustomer && before.customer_id) },
    });
    if (logError) console.error("[repairs] details log failed:", id, logError);
  }

  return NextResponse.json({
    success: true,
    ticket: data,
    ...(warnings.length ? { warning: warnings.join(" ") } : {}),
  });
}
