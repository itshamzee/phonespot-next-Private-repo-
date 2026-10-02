import { cookies, headers } from "next/headers";
import { requireStaff, type StaffIdentity } from "@/lib/auth/require-staff";
import { getStoreScope, STORE_SCOPE_COOKIE, type StoreScope } from "@/lib/auth/store-scope";

/**
 * Personale + scope til server components (admin-sider der renderes på
 * serveren). Bygger en Request af den indgående cookie-header, så samme
 * requireStaff-kodevej bruges som i route handlers.
 */
export async function staffScopeForPage(): Promise<{ staff: StaffIdentity; scope: StoreScope } | null> {
  const h = await headers();
  const request = new Request("http://internal/", { headers: { cookie: h.get("cookie") ?? "" } });
  const staff = await requireStaff(request);
  if (!staff) return null;
  const jar = await cookies();
  return { staff, scope: getStoreScope(staff, jar.get(STORE_SCOPE_COOKIE)?.value ?? null) };
}
