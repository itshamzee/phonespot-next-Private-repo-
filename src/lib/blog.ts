import fs from "fs";
import path from "path";
import matter from "gray-matter";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  slug: string;
  keywords: string;
  category: "guide" | "sammenligning" | "nyhed";
  coverImage?: string;
  /** Valgfri <title> til søgeresultatet (højst 60 tegn). H1 bruger stadig `title`. */
  seoTitle?: string;
  /** Dato for seneste faktatjek af priser og vilkår (YYYY-MM-DD). Vises som "Opdateret". */
  updated?: string;
  /** Hvilken handling artiklen slutter med. Udledes af slug/keywords, hvis den mangler. */
  cta?: BlogCta;
};

export type BlogCta = "saelg" | "reparation" | "koeb";

export type BlogPost = {
  frontmatter: BlogFrontmatter;
  content: string; // raw MDX string
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

function getMdxFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx"));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Returns all blog posts sorted by date descending (newest first). */
export function getAllPosts(): BlogPost[] {
  const files = getMdxFiles();

  const posts: BlogPost[] = files.map((filename) => {
    const filePath = path.join(BLOG_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
      frontmatter: data as BlogFrontmatter,
      content,
    };
  });

  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );
}

/** Returns a single post by slug, or null if not found. */
export function getPostBySlug(slug: string): BlogPost | null {
  const files = getMdxFiles();

  for (const filename of files) {
    const filePath = path.join(BLOG_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    if ((data as BlogFrontmatter).slug === slug) {
      return {
        frontmatter: data as BlogFrontmatter,
        content,
      };
    }
  }

  return null;
}

/** Returns all slugs for generateStaticParams. */
export function getAllSlugs(): { slug: string }[] {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.frontmatter.slug }));
}

/* ------------------------------------------------------------------ */
/*  Læsehjælp: CTA, relaterede artikler og indholdsfortegnelse         */
/* ------------------------------------------------------------------ */

/** Artiklens afsluttende handling: frontmatter `cta`, ellers udledt af emnet. */
export function getPostCta(frontmatter: BlogFrontmatter): BlogCta {
  if (frontmatter.cta) return frontmatter.cta;
  const slug = frontmatter.slug.toLowerCase();
  const keywords = (frontmatter.keywords ?? "").toLowerCase();
  if (/saelg|opkoeb/.test(slug) || /sælg|opkøb/.test(keywords)) return "saelg";
  if (/reparation|reparer|skift|lader-ikke|teardown/.test(slug) || keywords.includes("reparation")) return "reparation";
  return "koeb";
}

function keywordSet(frontmatter: BlogFrontmatter): Set<string> {
  return new Set(
    (frontmatter.keywords ?? "")
      .toLowerCase()
      .split(/[,\s]+/)
      .filter((w) => w.length > 3),
  );
}

/**
 * Relaterede artikler efter emne: flest fælles søgeordsord og samme CTA-type
 * først, derefter de nyeste. Så en opkøbsartikel viser andre opkøbsartikler.
 */
export function getRelatedPosts(slug: string, count = 3): BlogPost[] {
  const posts = getAllPosts();
  const current = posts.find((p) => p.frontmatter.slug === slug);
  if (!current) return posts.slice(0, count);
  const words = keywordSet(current.frontmatter);
  const cta = getPostCta(current.frontmatter);
  return posts
    .filter((p) => p.frontmatter.slug !== slug)
    .map((p, index) => {
      let overlap = 0;
      for (const w of keywordSet(p.frontmatter)) if (words.has(w)) overlap += 1;
      const sameCta = getPostCta(p.frontmatter) === cta ? 3 : 0;
      return { p, score: overlap + sameCta, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ p }) => p);
}

/** Samme id-regel som overskrifterne i artiklen, så ankerlinks rammer. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[^a-z0-9æøå]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** H2-overskrifter fra MDX-indholdet til indholdsfortegnelsen. */
export function getTableOfContents(content: string): { id: string; text: string }[] {
  return Array.from(content.matchAll(/^## (.+)$/gm))
    .map((m) =>
      m[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim(),
    )
    .filter(Boolean)
    .map((text) => ({ id: headingId(text), text }));
}
