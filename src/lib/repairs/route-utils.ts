import { NextResponse } from "next/server";
import type { StaffWithScope } from "@/lib/auth/store-scope-server";
import { parseLocationParam } from "@/lib/repairs/availability";
import type { CaseStore } from "@/lib/repairs/new-case-types";

/**
 * Butik lagertallene gælder: ?location=, ellers egen butik (ejeren: den valgte butik i topbjælken).
 * Ugyldige værdier ignoreres.
 */
export function resolveLocation(ctx: StaffWithScope, param: string | null): CaseStore | null {
  return parseLocationParam(param) ?? parseLocationParam(ctx.scope) ?? parseLocationParam(ctx.staff.location_slug);
}

export function badRequest(message: string, path?: string) {
  return NextResponse.json({ error: message, path }, { status: 400 });
}
