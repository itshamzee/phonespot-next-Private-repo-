import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import {
  SCOPE_LABELS,
  SCOPE_SLUGS,
  isOwner,
  normalizeScopeSlug,
  slugForLocationId,
  type ScopeSlug,
} from "@/lib/auth/store-scope";
import {
  forbiddenResponse,
  loadLocationIndex,
  resolveLocationId,
  unauthorizedResponse,
} from "@/lib/auth/store-scope-server";

/**
 * Medarbejdere og deres butik. KUN ejeren (role 'owner') — det er den eneste
 * super-admin, og den eneste der kan flytte folk mellem butikker.
 *
 * GET   -> { staff: [...], stores: [{ slug, label }] }
 * PATCH -> { id, location_slug: 'vejle' | 'slagelse' | 'webshop' | null }
 */

type OwnerCheck = { ok: true } | { ok: false; response: NextResponse };

async function requireOwner(request: NextRequest): Promise<OwnerCheck> {
  const staff = await requireStaff(request);
  if (!staff) return { ok: false, response: unauthorizedResponse() };
  if (!isOwner(staff)) {
    return { ok: false, response: forbiddenResponse("Kun ejeren kan administrere medarbejdere.") };
  }
  return { ok: true };
}

export async function GET(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, email, role, is_active, location_id")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/staff] list failed:", error);
    return NextResponse.json({ error: "Kunne ikke hente medarbejdere" }, { status: 500 });
  }

  const index = await loadLocationIndex();
  const staff = (data ?? []).map((row) => ({
    ...row,
    location_slug: slugForLocationId(index, row.location_id),
  }));
  const stores = SCOPE_SLUGS.map((slug) => ({ slug, label: SCOPE_LABELS[slug], available: Boolean(index.idBySlug[slug]) }));

  return NextResponse.json({ staff, stores }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Medarbejder mangler" }, { status: 400 });

  const requested = body.location_slug;
  let slug: ScopeSlug | null = null;
  if (requested !== null && requested !== "") {
    slug = normalizeScopeSlug(requested);
    if (!slug) return NextResponse.json({ error: "Ukendt butik" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: target, error: loadError } = await supabase
    .from("staff")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: "Kunne ikke hente medarbejderen" }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Medarbejder ikke fundet" }, { status: 404 });
  if (target.role === "owner") {
    return NextResponse.json({ error: "Ejeren ser alle butikker og skal ikke knyttes til en." }, { status: 400 });
  }

  let locationId: string | null = null;
  if (slug) {
    locationId = await resolveLocationId(slug);
    if (!locationId) {
      return NextResponse.json({ error: "Butikken findes ikke i databasen endnu" }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from("staff")
    .update({ location_id: locationId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[admin/staff] update failed:", id, error);
    return NextResponse.json({ error: "Kunne ikke gemme butikken" }, { status: 500 });
  }
  return NextResponse.json({ success: true, location_slug: slug });
}
