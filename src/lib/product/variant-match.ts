/**
 * Storage/colour variant matching for the device PDP buy box.
 *
 * `selectedStorage`/`selectedColor` are `""` only when the template has no
 * `storage_options`/`colors` at all — i.e. there is no capacity/colour
 * concept for this model, so every unit trivially matches regardless of its
 * own (possibly null) field.
 *
 * The moment a specific capacity or colour IS selected (selected* is
 * non-empty), a unit whose own value is unknown (`null`) must NOT be
 * allowed to silently satisfy that choice — a 128GB phone with no storage
 * recorded on the device row must never be matched, sold, and invoiced as
 * 1TB just because nobody filled in its `storage` column. Such units simply
 * won't match any specific selection until the field is filled in; they
 * stay invisible/unsellable via this path rather than masquerading as
 * whatever the shopper picked.
 */
export function matchesStorage(
  deviceStorage: string | null | undefined,
  selectedStorage: string,
): boolean {
  return selectedStorage === "" || deviceStorage === selectedStorage;
}

/** Same rule as {@link matchesStorage}, for colour. */
export function matchesColor(
  deviceColor: string | null | undefined,
  selectedColor: string,
): boolean {
  return selectedColor === "" || deviceColor === selectedColor;
}

/**
 * What to write onto the cart line for storage/colour: always the physical
 * unit's own value when it's known. The `selected*` argument is only used
 * as a stand-in when the field genuinely doesn't apply to this template (no
 * storage_options/colors at all, so `selected*` is `""`) — never to paper
 * over an unknown value on a unit that matched by capacity/colour, because
 * (given `matchesStorage`/`matchesColor` above) a unit can only match a
 * specific selection when its own field already equals that selection.
 */
export function resolveCartStorage(
  unitStorage: string | null | undefined,
  selectedStorage: string,
): string {
  return unitStorage ?? selectedStorage;
}

/** Same rule as {@link resolveCartStorage}, for colour. */
export function resolveCartColor(
  unitColor: string | null | undefined,
  selectedColor: string,
): string {
  return unitColor ?? selectedColor;
}
