/**
 * Rollen "intern" (praktikant) må kun bruge hurtig tilbehørsoptagelsen.
 * Håndhæves i requireStaff og middleware (API) og i admin-layoutet (sider).
 * Tilføj kun ruter her, som hurtig-optagelsen selv kalder.
 */
export const INTERN_ROLE = "intern";
export const INTERN_HOME = "/admin/produkter/hurtig-cover";

const ALLOWED: Record<string, readonly string[]> = {
  "/api/admin/me": ["GET"],
  "/api/admin/accessories/by-ean": ["GET", "POST"],
  "/api/admin/accessories/identify": ["POST"],
  "/api/admin/accessories/studio-photo": ["POST"],
  "/api/admin/accessories/candidates": ["POST"],
  "/api/admin/accessories/generate-ean": ["POST"],
  // Kun oprettelse af tilbehør; ruten afviser andre typer for praktikanter.
  "/api/admin/products": ["POST"],
  "/api/platform/images/upload": ["POST"],
  // Åbn/luk lagersalgskasser fra optagelsen.
  "/api/admin/lagersalg/boxes": ["GET", "POST"],
};

export function internMayAccess(pathname: string, method: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return ALLOWED[path]?.includes(method.toUpperCase()) ?? false;
}

export function internMayOpenPage(pathname: string): boolean {
  return pathname === INTERN_HOME;
}
