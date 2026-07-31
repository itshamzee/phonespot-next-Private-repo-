import crypto from "node:crypto";

/**
 * Shipmondo delivers webhook payloads as a JWT signed with the key we chose when
 * the subscription was created (POST /webhooks takes `key`). That signature is
 * the verification — there is no separate shared-secret header to check.
 */

function base64UrlDecode(part: string): Buffer {
  return Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Verifies an HS256 JWT and returns its payload, or null if anything is off.
 *
 * Rejects tokens that name a different algorithm rather than trusting the header:
 * accepting `alg: none` is the classic way this check gets defeated.
 */
export function verifyShipmondoJwt(token: string, key: string): unknown | null {
  if (!token || !key) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  let header: { alg?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerPart).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;

  const expected = crypto
    .createHmac("sha256", key)
    .update(`${headerPart}.${payloadPart}`)
    .digest();
  const given = base64UrlDecode(signaturePart);

  if (expected.length !== given.length) return null;
  if (!crypto.timingSafeEqual(expected, given)) return null;

  try {
    return JSON.parse(base64UrlDecode(payloadPart).toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * The body arrives either as the bare JWT or wrapped in JSON. Both are accepted
 * because the Shipment Monitor payload is not in the OpenAPI spec, and guessing
 * wrong would mean dropping real events.
 */
export function extractToken(rawBody: string): string | null {
  const trimmed = rawBody.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith("{")) {
    return trimmed.split(".").length === 3 ? trimmed : null;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    for (const field of ["token", "jwt", "data", "payload", "message"]) {
      const value = parsed[field];
      if (typeof value === "string" && value.split(".").length === 3) return value;
    }
  } catch {
    return null;
  }
  return null;
}

export type ShipmentProgress = "in_transit" | "delivered";

/**
 * Maps a carrier status onto the two moments we act on. Anything else returns
 * null and changes nothing — an unrecognised status must not be allowed to move
 * a parcel backwards or mark it delivered by accident.
 */
export function mapCarrierStatus(status: unknown): ShipmentProgress | null {
  if (typeof status !== "string") return null;
  const s = status.trim().toLowerCase();
  if (!s) return null;

  // Delivered is checked first: "delivered_to_service_point" is an arrival, and
  // matching "in transit" loosely would otherwise swallow it.
  if (s.includes("deliver") || s.includes("leveret") || s.includes("udleveret")) {
    return "delivered";
  }
  if (
    s.includes("transit") ||
    s.includes("en_route") ||
    s.includes("undervejs") ||
    s.includes("picked_up") ||
    s.includes("collected") ||
    s.includes("scanned")
  ) {
    return "in_transit";
  }
  return null;
}

/** Pulls the tracking number out of a payload whose exact shape is undocumented. */
export function extractTrackingNumber(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;

  for (const field of ["pkg_no", "package_number", "tracking_number", "external_pkg_no"]) {
    const value = p[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  // Shipmondo nests the shipment under a resource key on some events.
  for (const nested of ["shipment", "data", "resource", "shipment_monitor"]) {
    const inner = p[nested];
    if (inner && typeof inner === "object") {
      const found = extractTrackingNumber(inner);
      if (found) return found;
    }
  }
  return null;
}

/** Same defensiveness for the status field. */
export function extractStatus(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;

  for (const field of ["status", "state", "shipment_status", "event"]) {
    const value = p[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const nested of ["shipment", "data", "resource", "shipment_monitor"]) {
    const inner = p[nested];
    if (inner && typeof inner === "object") {
      const found = extractStatus(inner);
      if (found) return found;
    }
  }
  return null;
}
