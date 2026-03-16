import { NextResponse } from "next/server";
import { updateReservationStatus } from "@/lib/supabase/accessories";
import type { Reservation } from "@/lib/supabase/platform-types";

const ALLOWED_STATUSES: Reservation["status"][] = [
  "pending",
  "ready",
  "collected",
  "expired",
  "cancelled",
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "status er påkrævet" }, { status: 400 });
  }

  if (!ALLOWED_STATUSES.includes(status as Reservation["status"])) {
    return NextResponse.json(
      {
        error: `Ugyldig status. Tilladte værdier: ${ALLOWED_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    const reservation = await updateReservationStatus(
      id,
      status as Reservation["status"]
    );
    return NextResponse.json(reservation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
