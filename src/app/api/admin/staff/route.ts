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
import { PERMISSIONS, parsePermissions } from "@/lib/auth/permissions";
import { hashPin, isValidPin } from "@/lib/auth/pin";
import { isPinLocked } from "@/lib/auth/pin-attempts";
import { isStaffRole, passwordProblem, validateNewStaff } from "@/lib/auth/staff-admin";

/**
 * Medarbejdere og deres butik. KUN ejeren (role 'owner') — det er den eneste
 * super-admin, og den eneste der kan flytte folk mellem butikker.
 *
 * GET   -> { staff: [...], stores: [{ slug, label }] }
 * POST  -> { name, email, role: 'employee' | 'manager', location_slug, password }
 *          Opretter login (Supabase Auth, e-mail bekræftet) + staff-række.
 * PATCH -> { id, location_slug?, role?, is_active?, password?, permissions?, pin? }
 *          permissions: kun eksplicitte tilladelser (rollens standard gemmes ikke).
 *          pin: 4-6 cifre sætter/nulstiller (også en lås); null fjerner pinkoden.
 *          Pinkoden bor kun i staff_pins og returneres aldrig.
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
    .select("id, name, email, role, is_active, location_id, permissions")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/staff] list failed:", error);
    return NextResponse.json({ error: "Kunne ikke hente medarbejdere" }, { status: 500 });
  }

  const { data: pinRows, error: pinError } = await supabase
    .from("staff_pins")
    .select("staff_id, failed_attempts, locked_until");
  if (pinError) {
    console.error("[admin/staff] pin list failed:", pinError);
    return NextResponse.json({ error: "Kunne ikke hente medarbejdere" }, { status: 500 });
  }
  const pins = new Map(
    ((pinRows ?? []) as Array<{ staff_id: string; failed_attempts: number; locked_until: string | null }>).map((p) => [p.staff_id, p]),
  );
  const nowMs = Date.now();

  const index = await loadLocationIndex();
  const staff = (data ?? []).map((row) => {
    const pin = pins.get(row.id);
    return {
      ...row,
      permissions: parsePermissions(row.permissions),
      hasPin: Boolean(pin),
      pinLocked: pin ? isPinLocked(pin, nowMs) : false,
      location_slug: slugForLocationId(index, row.location_id),
    };
  });
  const stores = SCOPE_SLUGS.map((slug) => ({ slug, label: SCOPE_LABELS[slug], available: Boolean(index.idBySlug[slug]) }));

  return NextResponse.json({ staff, stores }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;

  const parsed = validateNewStaff(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const slug = normalizeScopeSlug(input.location_slug);
  if (!slug) return NextResponse.json({ error: "Ukendt butik" }, { status: 400 });
  const locationId = await resolveLocationId(slug);
  if (!locationId) return NextResponse.json({ error: "Butikken findes ikke i databasen endnu" }, { status: 409 });

  const supabase = createServerClient();
  const { data: existing } = await supabase.from("staff").select("id").eq("email", input.email).maybeSingle();
  if (existing) return NextResponse.json({ error: "Der findes allerede en medarbejder med den e-mail." }, { status: 409 });

  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });
  if (authError || !created?.user) {
    const taken = /already|registered|exists/i.test(authError?.message ?? "");
    console.error("[admin/staff] create auth user failed:", authError?.message);
    return NextResponse.json(
      { error: taken ? "E-mailen bruges allerede af en anden konto. Brug en anden e-mail." : "Kunne ikke oprette login. Prøv igen." },
      { status: taken ? 409 : 500 },
    );
  }

  const { data: row, error } = await supabase
    .from("staff")
    .insert({ auth_id: created.user.id, name: input.name, email: input.email, role: input.role, location_id: locationId, is_active: true })
    .select("id, name, email, role, is_active, location_id")
    .single();
  if (error || !row) {
    console.error("[admin/staff] insert failed:", error?.message);
    // Ryd op, så e-mailen kan bruges igen ved næste forsøg.
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return NextResponse.json({ error: "Kunne ikke oprette medarbejderen. Prøv igen." }, { status: 500 });
  }

  return NextResponse.json({ success: true, staff: { ...row, location_slug: slug } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Medarbejder mangler" }, { status: 400 });

  const supabase = createServerClient();
  const { data: target, error: loadError } = await supabase
    .from("staff")
    .select("id, role, auth_id")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: "Kunne ikke hente medarbejderen" }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Medarbejder ikke fundet" }, { status: 404 });
  if (target.role === "owner") {
    return NextResponse.json({ error: "Ejerens profil kan ikke ændres her." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  let slug: ScopeSlug | null = null;

  if ("location_slug" in body) {
    const requested = body.location_slug;
    if (requested !== null && requested !== "") {
      slug = normalizeScopeSlug(requested);
      if (!slug) return NextResponse.json({ error: "Ukendt butik" }, { status: 400 });
      const locationId = await resolveLocationId(slug);
      if (!locationId) {
        return NextResponse.json({ error: "Butikken findes ikke i databasen endnu" }, { status: 409 });
      }
      update.location_id = locationId;
    } else {
      update.location_id = null;
    }
  }
  if ("role" in body) {
    if (!isStaffRole(body.role)) return NextResponse.json({ error: "Ukendt rolle" }, { status: 400 });
    update.role = body.role;
  }
  if ("is_active" in body) {
    if (typeof body.is_active !== "boolean") return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
    update.is_active = body.is_active;
  }
  if ("password" in body) {
    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }
  let permissions: string[] | null = null;
  if ("permissions" in body) {
    const raw = body.permissions;
    const known: readonly string[] = PERMISSIONS;
    if (!Array.isArray(raw) || !raw.every((p) => typeof p === "string" && known.includes(p))) {
      return NextResponse.json({ error: "Ukendt tilladelse" }, { status: 400 });
    }
    permissions = Array.from(new Set(raw as string[]));
    update.permissions = permissions;
  }
  let pin: string | null | undefined;
  if ("pin" in body) {
    if (body.pin === null) pin = null;
    else if (typeof body.pin === "string" && isValidPin(body.pin)) pin = body.pin;
    else return NextResponse.json({ error: "Pinkoden skal være 4–6 cifre" }, { status: 400 });
  }
  if (Object.keys(update).length === 0 && !("password" in body) && pin === undefined) {
    return NextResponse.json({ error: "Intet at gemme" }, { status: 400 });
  }

  if ("password" in body) {
    const { error: pwError } = await supabase.auth.admin.updateUserById(target.auth_id as string, {
      password: body.password as string,
    });
    if (pwError) {
      console.error("[admin/staff] password reset failed:", id, pwError.message);
      return NextResponse.json({ error: "Kunne ikke skifte adgangskoden. Prøv igen." }, { status: 500 });
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("staff")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[admin/staff] update failed:", id, error);
      return NextResponse.json({ error: "Kunne ikke gemme ændringen" }, { status: 500 });
    }
  }
  if (pin !== undefined) {
    const result =
      pin === null
        ? await supabase.from("staff_pins").delete().eq("staff_id", id)
        : await supabase.from("staff_pins").upsert(
            { staff_id: id, pin_hash: hashPin(pin), failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() },
            { onConflict: "staff_id" },
          );
    if (result.error) {
      console.error("[admin/staff] pin save failed:", id, result.error);
      return NextResponse.json({ error: "Kunne ikke gemme pinkoden" }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true, ...("location_slug" in body ? { location_slug: slug } : {}) });
}
