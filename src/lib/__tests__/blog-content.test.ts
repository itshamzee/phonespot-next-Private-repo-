import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  getAllPosts,
  getPostCta,
  getRelatedPosts,
  getTableOfContents,
  headingId,
} from "@/lib/blog";

const PUBLIC = path.join(process.cwd(), "public");
const exists = (src: string) => fs.existsSync(path.join(PUBLIC, decodeURIComponent(src).replace(/^\//, "")));

describe("blogindhold", () => {
  const posts = getAllPosts();

  it("har et lokalt forsidebillede på alle indlæg, der findes i public", () => {
    for (const { frontmatter } of posts) {
      expect(frontmatter.coverImage, frontmatter.slug).toMatch(/^\/(images|blog)\//);
      expect(exists(frontmatter.coverImage!), frontmatter.coverImage).toBe(true);
    }
  });

  it("har mindst ét billede i teksten, og alle billeder findes", () => {
    for (const { frontmatter, content } of posts) {
      const srcs = Array.from(content.matchAll(/<Figure[^>]*\ssrc="([^"]+)"/g)).map((m) => m[1]);
      expect(srcs.length, frontmatter.slug).toBeGreaterThan(0);
      for (const src of srcs) expect(exists(src), `${frontmatter.slug}: ${src}`).toBe(true);
    }
  });

  it("bruger aldrig billeder fra andre domæner", () => {
    for (const { frontmatter, content } of posts) {
      expect(frontmatter.coverImage ?? "", frontmatter.slug).not.toMatch(/^https?:/);
      expect(content, frontmatter.slug).not.toMatch(/<Figure[^>]*src="https?:/);
    }
  });
});

describe("blog-hjælpere", () => {
  it("laver samme id som overskrifterne og bygger indholdsfortegnelsen", () => {
    expect(headingId('Hvad betyder "fast pris"?')).toBe("hvad-betyder-fast-pris");
    expect(getTableOfContents("intro\n## Første del\ntekst\n## [Link](/x) og **fed**\n### under")).toEqual([
      { id: "første-del", text: "Første del" },
      { id: "link-og-fed", text: "Link og fed" },
    ]);
  });

  it("vælger CTA efter emne", () => {
    const base = { title: "", description: "", date: "2026-11-10", keywords: "", category: "guide" as const };
    expect(getPostCta({ ...base, slug: "saelg-brugt-elektronik-guide" })).toBe("saelg");
    expect(getPostCta({ ...base, slug: "ipad-lader-ikke-ladestik-reparation" })).toBe("reparation");
    expect(getPostCta({ ...base, slug: "bedste-refurbished-iphone-2026" })).toBe("koeb");
    expect(getPostCta({ ...base, slug: "noget", cta: "reparation" })).toBe("reparation");
  });

  it("viser relaterede artikler om samme emne", () => {
    const related = getRelatedPosts("saelg-brugt-telefon-slagelse", 3);
    expect(related).toHaveLength(3);
    expect(related.every((p) => getPostCta(p.frontmatter) === "saelg")).toBe(true);
  });
});
