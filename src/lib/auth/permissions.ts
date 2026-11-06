/**
 * Tilladelser pr. medarbejder. Rollen giver en standard (ROLE_DEFAULTS); ekstra
 * tilladelser gives pr. medarbejder i `staff.permissions`. Ejeren må alt.
 */
export const PERMISSIONS = [
  "se_indkoebspris",
  "se_andre_butikkers_omsaetning",
  "rette_priser",
  "give_rabat",
  "lave_retur",
  "lukke_dagen",
  "se_statistik",
  "eksportere",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  se_indkoebspris: "Se indkøbspris",
  se_andre_butikkers_omsaetning: "Se andre butikkers omsætning",
  rette_priser: "Rette priser",
  give_rabat: "Give rabat",
  lave_retur: "Lave retur",
  lukke_dagen: "Lukke dagen",
  se_statistik: "Se statistik",
  eksportere: "Eksportere",
};

/** Bevarer dagens adfærd: medarbejdere og managere kan retur, lukke dagen og give rabat. */
export const ROLE_DEFAULTS: Record<string, Permission[]> = {
  employee: ["lave_retur", "lukke_dagen", "give_rabat"],
  manager: ["lave_retur", "lukke_dagen", "give_rabat"],
  intern: [],
};

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

/** Filtrerer ukendte strenge fra databasen fra. */
export function parsePermissions(raw: unknown): Permission[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is Permission => typeof p === "string" && PERMISSION_SET.has(p));
}

export function hasPermission(
  staff: { role: string; permissions?: readonly string[] | null },
  p: Permission,
): boolean {
  if (staff.role === "owner") return true;
  if (ROLE_DEFAULTS[staff.role]?.includes(p)) return true;
  return staff.permissions?.includes(p) ?? false;
}
