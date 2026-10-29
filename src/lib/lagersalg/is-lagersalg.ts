export type LagersalgSource = {
  subcategory: string | null;
  attributes: Record<string, string> | null | undefined;
};

// Lagersalgsvare = udsalg "Ja" og ikke beskyttelsesglas (glas er aldrig lagersalg).
export function isLagersalg(row: LagersalgSource): boolean {
  return row.attributes?.udsalg?.trim() === "Ja" && row.subcategory !== "screen_protector";
}
