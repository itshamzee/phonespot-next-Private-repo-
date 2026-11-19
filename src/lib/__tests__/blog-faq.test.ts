import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { extractBlogFaq } from "@/lib/blog-faq";

describe("extractBlogFaq", () => {
  it("læser spørgsmål og svar og fjerner markdown", () => {
    const md = [
      "## Noget andet",
      "Tekst",
      "## Ofte stillede spørgsmål",
      "",
      "### Hvor lang garanti får jeg?",
      "",
      "Du får **36 måneders garanti**. [Læs mere](/garanti).",
      "",
      "### Kan jeg returnere?",
      "Ja, *30 dages* returret.",
      "",
      "---",
      "## Klar?",
      "### Ikke et spørgsmål",
      "Nej.",
    ].join("\n");
    expect(extractBlogFaq(md)).toEqual([
      { question: "Hvor lang garanti får jeg?", answer: "Du får 36 måneders garanti. Læs mere." },
      { question: "Kan jeg returnere?", answer: "Ja, 30 dages returret." },
    ]);
  });

  it("returnerer intet uden FAQ-afsnit", () => {
    expect(extractBlogFaq("## Intro\n### Spørgsmål?\nSvar")).toEqual([]);
  });

  it("finder FAQ i de indlæg, der har et afsnit, og svarene er ikke tomme", () => {
    const dir = path.join(process.cwd(), "src/content/blog");
    const withFaq = readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => matter(readFileSync(path.join(dir, f), "utf8")).content)
      .filter((c) => /^##\s+Ofte stillede spørgsmål/m.test(c));
    expect(withFaq.length).toBeGreaterThan(10);
    for (const c of withFaq) {
      const faq = extractBlogFaq(c);
      expect(faq.length).toBeGreaterThan(0);
      for (const f of faq) {
        expect(f.answer.length).toBeGreaterThan(10);
        expect(f.answer).not.toMatch(/\]\(|\*\*|</);
      }
    }
  });
});
