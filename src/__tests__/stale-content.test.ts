import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Guards against stale facts and dead links reappearing in source.
 * Each entry documents WHY it is forbidden. If a test here fails, fix the
 * source file — do not edit this list unless a business fact truly changed.
 */
const ROOTS = ["src/app", "src/components", "src/lib"];
const SKIP = [/node_modules/, /__tests__/, /\.test\./, /\.recovered$/];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (SKIP.some((re) => re.test(full))) return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const FORBIDDEN: Array<{ name: string; pattern: RegExp }> = [
  // Live Trustpilot score is 4.8 — 4.4 is years stale
  { name: "stale Trustpilot 4.4", pattern: /Trustpilot 4\.4|4\.4 \/ 5 på Trustpilot|4,4 ★/ },
  // Vejle opened April 2026 — any coming-soon copy is misinformation
  { name: "Vejle coming-soon copy", pattern: /åbner april 2026|Åbner snart|Adresse oplyses snart/i },
  // Click&collect emails carried invented addresses (real: store-config.ts)
  { name: "invented store address", pattern: /Nørregade 22|Løvegade 12/ },
  // /salg and /refurbished (index) do not exist as routes
  { name: "dead /salg link", pattern: /href="\/salg"/ },
  { name: "dead /refurbished index link", pattern: /href="\/refurbished"/ },
  // Vejle is Løversysselvej 3B, not 3A (also appears URL-encoded)
  { name: "wrong Vejle street 3A", pattern: /Løversysselvej[+ ]3A|L%C3%B8versysselvej\+3A/ },
  // Copyright: customer-facing copy must say "beskyttelsesglas"
  { name: "banned word panserglas", pattern: /panserglas/i },
  // Actual threshold is 500 kr (src/lib/shipping.ts)
  { name: "wrong free-shipping threshold 499", pattern: /[Ff]ri fragt over 499/ },
];

describe("stale content guard", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const files = ROOTS.flatMap((r) => walk(path.join(repoRoot, r)));

  it.each(FORBIDDEN)("no $name in source", ({ pattern }) => {
    const hits = files
      .filter((f) => pattern.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(repoRoot, f));
    expect(hits).toEqual([]);
  });
});
