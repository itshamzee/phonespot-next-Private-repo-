/** Escape LIKE wildcards so ilike() is an exact, case-insensitive match. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * PostgREST treats "*" as an alias for "%" in like/ilike and escapeLike cannot
 * escape it, so an address containing "*" must never reach a LIKE filter.
 */
export function hasLikeWildcardStar(value: string): boolean {
  return value.includes("*");
}
