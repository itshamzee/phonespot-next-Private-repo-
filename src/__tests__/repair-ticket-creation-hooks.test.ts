// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { expect, it } from "vitest";

const ROOT = process.cwd();
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === "__tests__" || name === "node_modules") continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}
// Direkte insert, samt de to RPC'er der opretter sager for admin "Ny sag".
const INSERT = /from\(\s*["']repair_tickets["']\s*\)\s*\.insert\(|\.rpc\(\s*["']repair_case_create(_group)?["']/;

it("every code path that creates a repair ticket schedules the stock check (spec §4.4)", () => {
  const creators = walk(join(ROOT, "src")).filter((f) => INSERT.test(readFileSync(f, "utf8")));
  expect(creators.length).toBeGreaterThanOrEqual(5);
  const missing = creators.filter((f) => !readFileSync(f, "utf8").includes("scheduleTicketPartsCheck(")).map((f) => relative(ROOT, f));
  expect(missing).toEqual([]);
});
