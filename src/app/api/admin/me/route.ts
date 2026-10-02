import { NextResponse } from "next/server";
import { isOwner, staffStoreSlug } from "@/lib/auth/store-scope";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";

/**
 * GET /api/admin/me — hvem er jeg, hvilken butik hører jeg til, og hvilket
 * scope gælder lige nu (ejerens valg fra cookien ps_store; alle andre: egen butik).
 * Bruges af butiksvælgeren i topbjælken.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { staff, scope } = ctx;

  return NextResponse.json(
    {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      isOwner: isOwner(staff),
      ownSlug: staffStoreSlug(staff),
      scope,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
