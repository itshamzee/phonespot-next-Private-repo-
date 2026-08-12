import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { lookupStaffByAuthId, requireStaff } from "@/lib/auth/require-staff";

/**
 * Staff gate for /api/admin/** and /api/platform/**.
 *
 * Every route under those prefixes runs on a service-role Supabase client that
 * bypasses RLS, and almost none of them checked anything. Gating here closes
 * the whole surface at once instead of touching ~60 call sites.
 *
 * Accepted credentials — either is enough:
 *   - a staff cookie session (@supabase/ssr; sent automatically by fetch())
 *   - an `Authorization: Bearer <access token>` header (staffFetch())
 *
 * Fails closed: anything unexpected denies.
 *
 * Node runtime, not edge: the staff lookup uses the service-role key, which
 * belongs in a Node server env rather than inlined into an edge bundle.
 *
 * The allowlist below is derived in docs/api-auth-allowlist.md — keep them in
 * sync when adding routes.
 */
export const config = {
  runtime: "nodejs",
  matcher: ["/api/admin/:path*", "/api/platform/:path*"],
};

/**
 * Routes that sit under a gated prefix but are genuinely public.
 *
 * Method-scoped on purpose: the public /reservedele filter sidebar reads these
 * two listings, but POST on the same paths creates catalogue rows and stays
 * gated.
 */
const PUBLIC_ROUTES: Record<string, readonly string[]> = {
  "/api/admin/spare-parts/categories": ["GET", "HEAD"],
  "/api/admin/spare-parts/quality-tiers": ["GET", "HEAD"],
};

function isPublic(pathname: string, method: string): boolean {
  const normalised =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PUBLIC_ROUTES[normalised]?.includes(method) ?? false;
}

/** APIs answer with JSON, never a redirect to a login page. */
function deny(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Unauthorized" : "Forbidden",
      message:
        status === 401
          ? "Log ind som personale for at bruge dette endpoint."
          : "Din bruger har ikke personaleadgang.",
    },
    { status },
  );
}

export async function middleware(request: NextRequest) {
  if (isPublic(request.nextUrl.pathname, request.method)) {
    return NextResponse.next();
  }

  try {
    // Bearer path first: staffFetch() sends a token and no cookie, and there is
    // no cookie to refresh, so skip updateSession entirely.
    if (request.headers.get("authorization")?.startsWith("Bearer ")) {
      const staff = await requireStaff(request);
      return staff ? NextResponse.next() : deny(401);
    }

    // Cookie path. updateSession also writes back rotated cookies, so an
    // expired-but-refreshable session keeps working instead of 401-ing.
    const { response, user } = await updateSession(request);
    if (!user) return deny(401);

    const staff = await lookupStaffByAuthId(user.id);
    if (!staff) return deny(403);

    return response;
  } catch {
    // Staff lookup or auth call blew up — deny. Never fail open.
    return deny(401);
  }
}
