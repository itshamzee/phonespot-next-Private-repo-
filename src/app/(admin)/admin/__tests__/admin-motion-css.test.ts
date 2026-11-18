import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Vagt for src/app/admin-motion.css: al bevægelse ligger i blokken
 * prefers-reduced-motion: no-preference (eller i sikkerhedsnettet under reduce),
 * og filen bruger ikke de dyre eller forbudte egenskaber.
 */

const CSS_PATH = path.resolve(__dirname, "../../../admin-motion.css");

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** [start, end) for hver @media-blok, hvis betingelse matcher. */
function mediaBlocks(css: string, condition: RegExp): [number, number][] {
  const blocks: [number, number][] = [];
  const re = /@media\s*([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    if (!condition.test(m[1])) continue;
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    blocks.push([m.index, i]);
  }
  return blocks;
}

/** Fejl i teksten; tom liste = filen overholder reglerne. */
function motionViolations(raw: string): string[] {
  const css = stripComments(raw);
  const errors: string[] = [];
  const motion = mediaBlocks(css, /prefers-reduced-motion:\s*no-preference/);
  const reduce = mediaBlocks(css, /prefers-reduced-motion:\s*reduce/);
  if (motion.length !== 1) errors.push(`forventede én no-preference-blok, fandt ${motion.length}`);
  const allowed = [...motion, ...reduce];
  const inside = (pos: number) => allowed.some(([a, b]) => pos > a && pos < b);

  for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
    if (!inside(m.index!)) errors.push(`@keyframes ${m[1]} uden for bevægelsesblokken`);
  }
  for (const m of css.matchAll(/(?<![\w-])(transition|animation)(-[\w-]+)?\s*:/g)) {
    if (!inside(m.index!)) errors.push(`${m[0]} uden for bevægelsesblokken`);
  }
  if (/transition\s*:[^;]*\ball\b/.test(css)) errors.push("transition: all");
  if (/box-shadow\s*:/.test(css)) errors.push("box-shadow");
  if (/(?<![\w-])filter\s*:/.test(css)) errors.push("filter");
  if (/backdrop-filter\s*:/.test(css)) errors.push("backdrop-filter");
  return errors;
}

describe("admin-motion.css", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  it("har al bevægelse i no-preference-blokken og ingen forbudte egenskaber", () => {
    expect(motionViolations(css)).toEqual([]);
  });

  it("definerer de aftalte tokens og klasser", () => {
    for (const token of ["--ease-out", "--ease-sheet", "--dur-press", "--dur-fast", "--dur-base", "--dur-slow"]) {
      expect(css).toContain(`${token}:`);
    }
    for (const cls of [".m-enter", ".m-press", ".m-pop", ".m-backdrop", ".m-toast", ".m-busy", ".m-row-in", ".m-pending-bar", ".m-tap", ".m-skeleton"]) {
      expect(css).toContain(cls);
    }
  });

  it("vagten fanger regelbrud", () => {
    const bad = `
      .x { transition: opacity 1s; }
      @keyframes spin { to { transform: rotate(1turn); } }
      @media (prefers-reduced-motion: no-preference) { .y { transition: all 1s; box-shadow: 0 0 1px red; filter: blur(2px); } }
      .z { backdrop-filter: blur(4px); animation-duration: 2s; }
    `;
    const errors = motionViolations(bad);
    expect(errors).toEqual(
      expect.arrayContaining([
        "transition: uden for bevægelsesblokken",
        "@keyframes spin uden for bevægelsesblokken",
        "animation-duration: uden for bevægelsesblokken",
        "transition: all",
        "box-shadow",
        "filter",
        "backdrop-filter",
      ]),
    );
    expect(motionViolations(".a { opacity: 1 }")).toContain("forventede én no-preference-blok, fandt 0");
  });
});
