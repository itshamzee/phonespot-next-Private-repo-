// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
// Pages that still exist but are unreachable (301) or admin-only.
const EXCLUDED = [
  "src/app/(admin)",
  "src/app/reservedele",
  "src/app/api",
  "src/app/b2b/registrer", // 301 to /erhverv (Task 4)
  "src/app/b2b/page.tsx", // 301 to /erhverv (Task 4)
  "src/components/admin",
  "src/components/platform",
  "src/components/spare-parts",
].map((p) => p.split("/").join(sep));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full);
    if (name === "__tests__" || EXCLUDED.some((e) => rel === e || rel.startsWith(e + sep))) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|mdx)$/.test(name)) out.push(full);
  }
  return out;
}

const LINK = /(["'`(]|\]\()\/reservedele(["'`/?#)]|$)/m;

describe("kundevendte flader linker ikke til /reservedele", () => {
  const files = [...walk(join(ROOT, "src/app")), ...walk(join(ROOT, "src/components")), ...walk(join(ROOT, "src/content"))];

  it("finds files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("has no /reservedele links", () => {
    const offenders = files.filter((f) => LINK.test(readFileSync(f, "utf8"))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it("the repair FAQ no longer claims we sell spare parts", () => {
    expect(readFileSync(join(ROOT, "src/app/reparation/page.tsx"), "utf8")).not.toContain("Sælger I også reservedele");
  });

  it("no page or post claims we sell spare parts", () => {
    const CLAIM = /(sælger|fører)(?:(?!ikke)[^.\n]){0,40}reservedel/i;
    const offenders = files.filter((f) => CLAIM.test(readFileSync(f, "utf8"))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
