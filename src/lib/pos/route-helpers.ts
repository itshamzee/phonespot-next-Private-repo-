import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { toPosError } from "./errors";

/** Maps any thrown error to a JSON response; business errors keep their Danish message and status. */
export function posErrorResponse(err: unknown, fallback: string): NextResponse {
  const pos = toPosError(err);
  if (pos) return NextResponse.json({ error: pos.message, code: pos.code }, { status: pos.status });
  console.error("[pos]", fallback, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      response: NextResponse.json(
        { error: issue?.message || "Ugyldig forespørgsel", path: issue?.path.join(".") },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export const UNAUTHORIZED = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const FORBIDDEN = (msg = "Forbidden") => NextResponse.json({ error: msg }, { status: 403 });
