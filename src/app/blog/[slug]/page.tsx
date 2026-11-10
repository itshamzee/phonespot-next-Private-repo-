import { RepairCta } from "@/components/blog/repair-cta";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidElement, type ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import {
  getAllSlugs,
  getPostBySlug,
  getPostCta,
  getRelatedPosts,
  getTableOfContents,
  headingId,
  type BlogCta,
} from "@/lib/blog";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";
import { BlogCover } from "@/components/blog/blog-cover";
import { TransparencyPanel } from "@/components/blog/transparency-panel";

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

  const url = `https://phonespot.dk/blog/${post.frontmatter.slug}`;

  return {
    title: post.frontmatter.seoTitle ?? `${post.frontmatter.title} | PhoneSpot Blog`,
    description: post.frontmatter.description,
    keywords: post.frontmatter.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "da_DK",
      siteName: "PhoneSpot",
      url,
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      publishedTime: post.frontmatter.date,
      ...(post.frontmatter.coverImage && {
        images: [{ url: post.frontmatter.coverImage, width: 1200, height: 630 }],
      }),
    },
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
        <svg className="h-5 w-5 text-[#9CC5AB]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-display text-base font-bold tracking-tight text-[#9CC5AB]">
          Kort sagt
        </span>
      </div>
      <div className="font-body text-[17px] leading-relaxed text-white/90 [&>p]:m-0 [&_a]:text-white [&_a]:underline [&_strong]:text-white">{children}</div>
    </div>
  );
}

/**
 * Billede i artiklen med billedtekst. `wide` bryder ud af tekstspalten på
 * større skærme, så lange artikler får luft og rytme.
 */
function Figure({
  src,
  alt,
  caption,
  wide = false,
  ratio = "3/2",
}: {
  src: string;
  alt: string;
  caption?: string;
  wide?: boolean;
  ratio?: "3/2" | "16/9" | "4/3";
}) {
  const aspect = { "3/2": "aspect-[3/2]", "16/9": "aspect-[16/9]", "4/3": "aspect-[4/3]" }[ratio];
  return (
    <figure className={`not-prose my-12 ${wide ? "lg:-mr-24" : ""}`}>
      <div className={`relative ${aspect} overflow-hidden rounded-2xl bg-[#F7F7F8]`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={wide ? "(max-width: 1024px) 100vw, 776px" : "(max-width: 768px) 100vw, 680px"}
          className="object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 font-body text-sm leading-relaxed text-charcoal/55">{caption}</figcaption>
      )}
    </figure>
  );
}

function ComparisonBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-[#1A3D2E]/15 bg-[#f8f6f1] shadow-sm">
      <div className="p-6 font-body text-sm leading-relaxed text-charcoal/80 [&>p]:m-0 [&>ul]:mt-2 [&>ul]:space-y-1 [&>ul]:pl-4 [&>li]:list-disc">{children}</div>
    </div>
  );
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function createHeading(level: 2 | 3) {
  const Tag = `h${level}` as const;
  return function HeadingComponent({ children }: { children: React.ReactNode }) {
    return (
      <Tag id={headingId(textOf(children))} className="scroll-mt-28">
        {children}
      </Tag>
    );
  };
}

const mdxComponents = {
  Callout,
  Figure,
  RepairCta,
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

type CtaContent = {
  heading: string;
  text: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
};

const CTA: Record<BlogCta, CtaContent> = {
  saelg: {
    heading: "Gratis label. Vi modtager enheden. Du får pengene.",
    text: "Fast pris og pengene samme dag, som vi modtager enheden. Aflever i Vejle eller Slagelse, eller send den gratis.",
    primary: { href: "/saelg-din-enhed", label: "Få et tilbud" },
  },
  reparation: {
    heading: "Fast pris, før vi går i gang.",
    text: "Find din model og se prisen. Kom forbi i Vejle eller Slagelse uden tidsbestilling, eller send enheden ind.",
    primary: { href: "/reparation", label: "Find din model og pris" },
    secondary: { href: "/reparation/indsend", label: "Send ind" },
  },
  koeb: {
    heading: "Klar til at finde din næste enhed?",
    text: "Udforsk vores udvalg af kvalitetstestede refurbished iPhones med 36 måneders garanti.",
    primary: { href: "/iphones", label: "Se iPhones" },
  },
};

function ArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter, content } = post;
  const readingTime = getReadingTime(content);

  const relatedPosts = getRelatedPosts(slug, 3);
  const toc = getTableOfContents(content);
  const ctaKind = getPostCta(frontmatter);
  const cta = CTA[ctaKind];

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
          dateModified: frontmatter.updated ?? frontmatter.date,
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

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-6xl px-4 pt-6" aria-label="Brødkrumme">
        <ol className="flex items-center gap-2 text-sm text-charcoal/45 lg:ml-[284px]">
          <li><Link href="/" className="transition-colors hover:text-charcoal">Forside</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/blog" className="transition-colors hover:text-charcoal">Blog</Link></li>
          <li aria-hidden="true">/</li>
          <li className="line-clamp-1 text-charcoal/70">{frontmatter.title}</li>
        </ol>
      </nav>

      {/* Redaktionel header: titel og intro på ren baggrund, billedet under */}
      <header className="mx-auto max-w-6xl px-4 pt-8 md:pt-12">
        <div className="max-w-3xl lg:ml-[284px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-charcoal/55">
            <CategoryBadge category={frontmatter.category} />
            <span>Af PhoneSpots værksted</span>
            <span aria-hidden="true">&middot;</span>
            {frontmatter.updated && frontmatter.updated !== frontmatter.date ? (
              <span>
                Opdateret <time dateTime={frontmatter.updated}>{formatDate(frontmatter.updated)}</time>
              </span>
            ) : (
              <time dateTime={frontmatter.date}>{formatDate(frontmatter.date)}</time>
            )}
            <span aria-hidden="true">&middot;</span>
            <span>{readingTime} min. læsning</span>
          </div>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-charcoal [text-wrap:balance] md:text-5xl lg:text-[56px]">
            {frontmatter.title}
          </h1>
          <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-charcoal/65 md:text-xl">
            {frontmatter.description}
          </p>
        </div>
        {frontmatter.coverImage && (
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-3xl bg-[#F7F7F8] md:aspect-[21/9]">
            <BlogCover
              image={frontmatter.coverImage}
              title={frontmatter.title}
              slug={frontmatter.slug}
              sizes="(max-width: 1152px) 100vw, 1104px"
              priority
            />
          </div>
        )}
      </header>

      {/* Indholdsfortegnelse i venstre spalte på desktop, læsespalte til højre */}
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 lg:grid lg:grid-cols-[220px_minmax(0,680px)] lg:gap-16">
        {toc.length >= 3 ? (
          <aside className="hidden lg:block" aria-label="Indhold">
            <nav className="sticky top-28">
              <p className="font-display text-sm font-bold uppercase tracking-wide text-charcoal/45">I denne artikel</p>
              <ol className="mt-4 space-y-2.5 border-l border-[#E5E5EA]">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="-ml-px block border-l-2 border-transparent pl-4 font-body text-sm leading-snug text-charcoal/60 transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="min-w-0">
          {toc.length >= 4 && (
            <details className="mb-10 rounded-2xl border border-[#E5E5EA] px-5 py-4 lg:hidden">
              <summary className="cursor-pointer font-display text-base font-bold text-charcoal">I denne artikel</summary>
              <ol className="mt-3 space-y-2">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="font-body text-sm text-[#1A3D2E] underline-offset-2 hover:underline">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          <article
            className="prose prose-lg max-w-none
              prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:mt-16 prose-h2:mb-4 prose-h2:text-[30px] prose-h2:leading-tight prose-h2:text-[#1A3D2E]
              prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-[21px] prose-h3:text-charcoal
              prose-a:text-[#1A3D2E] prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-[#4a7a5e]
              prose-li:marker:text-[#1A3D2E]
              prose-strong:text-charcoal prose-strong:font-semibold
              prose-p:text-[#2a2d28] prose-p:font-body prose-p:leading-[1.75] prose-p:text-[18px]
              prose-li:text-[#2a2d28] prose-li:font-body prose-li:leading-[1.75] prose-li:text-[18px]
              prose-ul:my-6 prose-ol:my-6 prose-li:my-1.5
              prose-img:rounded-xl"
          >
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </article>

          <TransparencyPanel cta={ctaKind} />
        </div>
      </div>

      {/* CTA efter emne: opkøb, reparation eller køb */}
      <SectionWrapper background="green" className="!py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md" className="!text-white [text-wrap:balance]">
            {cta.heading}
          </Heading>
          <p className="mx-auto mt-3 max-w-xl font-body text-white/80">{cta.text}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={cta.primary.href}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-charcoal transition-opacity hover:opacity-90"
            >
              {cta.primary.label}
              <ArrowIcon />
            </Link>
            {cta.secondary && (
              <Link
                href={cta.secondary.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {cta.secondary.label}
              </Link>
            )}
          </div>
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
                    <ArrowIcon />
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
