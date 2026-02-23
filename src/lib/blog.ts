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
};

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
