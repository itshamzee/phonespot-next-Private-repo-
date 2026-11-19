/** Escape LIKE wildcards so ilike() is an exact, case-insensitive match. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
