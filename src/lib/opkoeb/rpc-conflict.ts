import { PosError, toPosError } from "@/lib/pos/errors";

/** RPC'ens forretningsfejl er konflikter med sedlens tilstand: 409 og den danske besked. */
export function rpcConflict(err: unknown): PosError | null {
  const pos = toPosError(err);
  if (!pos) return null;
  if (pos.status === 403 || pos.status === 404) return pos;
  return new PosError(pos.code, pos.message, 409);
}
