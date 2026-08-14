import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { getAllSlugs, getPostBySlug, getAllPosts } from "@/lib/blog";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";
import { BlogCover } from "@/components/blog/blog-cover";

/* ------------------------------------------------------------------ */
/*  Static params                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllSlugs();
}

/* ------------------------------------------------------------------ */
/*  Dynamic metadata                                                   */
/* ------------------------------------------------------------------ */

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.frontmatter.title} | PhoneSpot Blog`,
    description: post.frontmatter.description,
    keywords: post.frontmatter.keywords,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_STYLES: Record<string, { label: string; className: string }> = {
  guide: {
    label: "Guide",
    className: "bg-[#1A3D2E]/15 text-[#1A3D2E]",
  },
  sammenligning: {
    label: "Sammenligning",
    className: "bg-blue-100 text-blue-600",
  },
  nyhed: {
    label: "Nyhed",
    className: "bg-amber-100 text-amber-700",
  },
};

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.guide;
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function extractHeadings(content: string): { id: string; text: string; level: number }[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].replace(/\*\*/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9æøå]+/g, "-")
      .replace(/^-|-$/g, "");
    headings.push({ id, text, level: match[1].length });
  }
  return headings;
}

/* ------------------------------------------------------------------ */
/*  Custom MDX components                                              */
/* ------------------------------------------------------------------ */

function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "tip" | "warning" }) {
  const styles = {
    info: "border-[#1A3D2E] bg-[#1A3D2E]/10 shadow-sm",
    tip: "border-amber-500 bg-amber-50 shadow-sm",
    warning: "border-red-500 bg-red-50 shadow-sm",
  };
  const icons = {
    info: (
      <svg className="h-5 w-5 shrink-0 text-[#1A3D2E]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
    tip: (
      <svg className="h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  };
  return (
    <div className={`not-prose my-8 flex gap-4 rounded-xl border-l-4 p-5 ${styles[type]}`}>
      {icons[type]}
      <div className="font-body text-sm leading-relaxed text-[#2a2d28] [&>p]:m-0">{children}</div>
    </div>
  );
}

function KeyTakeaway({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-10 rounded-2xl bg-[#1A3D2E] p-8 text-white ring-1 ring-white/10">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-5 w-5 text-green-eco" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-display text-sm font-bold tracking-tight text-green-eco">
          Kort sagt
        </span>
      </div>
      <div className="font-body text-base leading-relaxed text-white/80 [&>p]:m-0">{children}</div>
    </div>
  );
}

function ComparisonBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-[#1A3D2E]/15 bg-[#f8f6f1] shadow-sm">
      <div className="p-6 font-body text-sm leading-relaxed text-charcoal/80 [&>p]:m-0 [&>ul]:mt-2 [&>ul]:space-y-1 [&>ul]:pl-4 [&>li]:list-disc">{children}</div>
    </div>
  );
}

function createHeading(level: 2 | 3) {
  const Tag = `h${level}` as const;
  return function HeadingComponent({ children }: { children: React.ReactNode }) {
    const text = typeof children === "string" ? children : "";
    const id = text
      .toLowerCase()
      .replace(/\*\*/g, "")
      .replace(/[^a-z0-9æøå]+/g, "-")
      .replace(/^-|-$/g, "");
    return <Tag id={id}>{children}</Tag>;
  };
}

const mdxComponents = {
  Callout,
  KeyTakeaway,
  ComparisonBox,
  h2: createHeading(2),
  h3: createHeading(3),
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="not-prose my-8 overflow-x-auto rounded-xl border border-[#ddd]">
      <table className="w-full text-sm" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: React.ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-charcoal text-white" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<"th">) => (
    <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wide" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<"td">) => (
    <td className="border-t border-[#e8e8e8] px-4 py-3 font-body text-charcoal/80" {...props}>{children}</td>
  ),
  tr: ({ children, ...props }: React.ComponentPropsWithoutRef<"tr">) => (
    <tr className="even:bg-[#f8f6f1]" {...props}>{children}</tr>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="not-prose my-8 border-l-4 border-[#1A3D2E] bg-[#1A3D2E]/5 py-4 pl-6 pr-4 font-body text-base italic leading-relaxed text-charcoal/80"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <div className="not-prose my-12 flex items-center justify-center gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-green-eco/40" />
      <div className="h-1.5 w-1.5 rounded-full bg-green-eco/60" />
      <div className="h-1.5 w-1.5 rounded-full bg-green-eco/40" />
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter, content } = post;
  const readingTime = getReadingTime(content);
  const headings = extractHeadings(content);

  const allPosts = getAllPosts();
  const relatedPosts = allPosts
    .filter((p) => p.frontmatter.slug !== slug)
    .slice(0, 3);

  return (
    <>
      {/* Article JSON-LD */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: frontmatter.title,
          description: frontmatter.description,
          datePublished: frontmatter.date,
          ...(frontmatter.coverImage && { image: `https://phonespot.dk${frontmatter.coverImage}` }),
          author: { "@type": "Organization", name: "PhoneSpot" },
          publisher: { "@type": "Organization", name: "PhoneSpot", url: "https://phonespot.dk" },
        }}
      />

      {/* BreadcrumbList JSON-LD */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://phonespot.dk/blog" },
            { "@type": "ListItem", position: 3, name: frontmatter.title, item: `https://phonespot.dk/blog/${frontmatter.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-charcoal">
        {/* Subtle pattern for no-image hero */}
        {!frontmatter.coverImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A3D2E]/20 to-transparent" />
        )}
        <div className={`mx-auto max-w-7xl ${frontmatter.coverImage ? "grid md:grid-cols-2" : ""}`}>
          <div className={`flex flex-col justify-center px-4 py-16 md:py-20 lg:py-24 ${frontmatter.coverImage ? "md:pr-12 lg:pr-16" : "mx-auto max-w-3xl text-center"}`}>
            <nav className={`mb-6 flex items-center gap-2 text-sm text-white/50 ${!frontmatter.coverImage ? "justify-center" : ""}`}>
              <Link href="/" className="transition-colors hover:text-white">Forside</Link>
              <span>/</span>
              <Link href="/blog" className="transition-colors hover:text-white">Blog</Link>
              <span>/</span>
              <span className="line-clamp-1 text-white/70">{frontmatter.title}</span>
            </nav>

            <div className={`flex items-center gap-3 ${!frontmatter.coverImage ? "justify-center" : ""}`}>
              <CategoryBadge category={frontmatter.category} />
              <time dateTime={frontmatter.date} className="text-sm text-white/40">
                {formatDate(frontmatter.date)}
              </time>
              <span className="text-sm text-white/40">&middot; {readingTime} min</span>
            </div>

            <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {frontmatter.title}
            </h1>

            <p className={`mt-4 font-body text-base leading-relaxed text-white/60 ${frontmatter.coverImage ? "max-w-lg" : "mx-auto max-w-2xl"}`}>
              {frontmatter.description}
            </p>
          </div>

          {frontmatter.coverImage && (
            <div className="hidden items-center p-8 md:flex lg:p-12">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                <BlogCover
                  image={frontmatter.coverImage}
                  title={frontmatter.title}
                  slug={frontmatter.slug}
                  sizes="50vw"
                  priority
                  padded
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Content + Sidebar */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:py-20">
        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-12">
          {/* MDX */}
          <article
            className="prose prose-lg mx-auto max-w-3xl lg:mx-0
              prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-charcoal
              prose-h2:mt-14 prose-h2:mb-6 prose-h2:border-b prose-h2:border-[#ddd] prose-h2:pb-3 prose-h2:text-2xl
              prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-xl
              prose-a:text-[#1A3D2E] prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-[#4a7a5e]
              prose-li:marker:text-[#1A3D2E]
              prose-strong:text-charcoal prose-strong:font-semibold
              prose-p:text-[#2a2d28] prose-p:font-body prose-p:leading-[1.8] prose-p:text-[17px]
              prose-li:text-[#2a2d28] prose-li:font-body prose-li:leading-[1.8]
              prose-ul:my-6 prose-ol:my-6
              prose-img:rounded-xl prose-img:shadow-md"
          >
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </article>

          {/* Sticky TOC sidebar */}
          {headings.length > 3 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-[#888]">
                  Indhold
                </p>
                <nav className="space-y-1 border-l border-sand/40">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block border-l-2 border-transparent py-1.5 font-body text-[13px] leading-snug text-[#555] transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E] ${
                        h.level === 2 ? "pl-4 font-medium" : "pl-7"
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>

                <div className="mt-8 rounded-xl bg-charcoal p-5">
                  <p className="font-display text-sm font-bold text-white">
                    Klar til at handle?
                  </p>
                  <p className="mt-1 font-body text-xs leading-relaxed text-white/50">
                    Se vores udvalg af refurbished enheder med 36 mdr. garanti.
                  </p>
                  <Link
                    href="/iphones"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-eco px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Se produkter
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* CTA */}
      <SectionWrapper background="green" className="!py-16">
        <div className="text-center">
          <Heading as="h2" size="md" className="!text-white">
            Klar til at finde din næste enhed?
          </Heading>
          <p className="mx-auto mt-3 max-w-xl font-body text-white/70">
            Udforsk vores udvalg af kvalitetstestede refurbished iPhones med 36 måneders garanti.
          </p>
          <Link
            href="/iphones"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-charcoal transition-opacity hover:opacity-90"
          >
            Se iPhones
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </SectionWrapper>

      {/* Related */}
      {relatedPosts.length > 0 && (
        <SectionWrapper background="cream">
          <Heading as="h2" size="md" className="text-center">
            Relaterede artikler
          </Heading>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.frontmatter.slug}
                href={`/blog/${related.frontmatter.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-sand/50 bg-white transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <BlogCover
                    image={related.frontmatter.coverImage}
                    title={related.frontmatter.title}
                    slug={related.frontmatter.slug}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <CategoryBadge category={related.frontmatter.category} />
                    <time dateTime={related.frontmatter.date} className="text-xs text-charcoal/50">
                      {formatDate(related.frontmatter.date)}
                    </time>
                  </div>
                  <h3 className="font-display text-lg font-bold text-charcoal transition-colors group-hover:text-[#1A3D2E]">
                    {related.frontmatter.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 flex-1 font-body text-sm leading-relaxed text-charcoal/60">
                    {related.frontmatter.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1A3D2E]">
                    Læs mere
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </SectionWrapper>
      )}
    </>
  );
}
