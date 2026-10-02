/**
 * PostgREST puts `.in()` lists in the URL, so hundreds of uuids overflow the
 * request line and the query fails. These helpers batch the ids.
 */

export const IN_CHUNK_SIZE = 100;

export function chunkIds<T>(ids: readonly T[], size: number = IN_CHUNK_SIZE): T[][] {
  if (size < 1) throw new Error("chunk size must be at least 1");
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

interface QueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Runs `run` once per batch of ids and concatenates the rows. If any batch
 * fails, `error` is set (the first failure) so callers can show a banner rather
 * than silently treating the missing rows as "nothing there".
 */
export async function fetchInChunks<T>(
  ids: readonly string[],
  run: (chunk: string[]) => PromiseLike<QueryResult<T>>,
  size: number = IN_CHUNK_SIZE,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const results = await Promise.all(chunkIds(ids, size).map((c) => run(c)));
  const data: T[] = [];
  let error: { message: string } | null = null;
  for (const r of results) {
    if (r.error && !error) error = r.error;
    if (r.data) data.push(...r.data);
  }
  return { data, error };
}
