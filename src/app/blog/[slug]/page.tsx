import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { getAllSlugs, getPostBySlug, getAllPosts } from "@/lib/blog";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";

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
    className: "bg-[#5A8C6F]/15 text-[#5A8C6F]",
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter, content } = post;

  // Related articles: all other posts, take first 3
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
          author: {
            "@type": "Organization",
            name: "PhoneSpot",
          },
          publisher: {
            "@type": "Organization",
            name: "PhoneSpot",
            url: "https://phonespot.dk",
          },
        }}
      />

      {/* BreadcrumbList JSON-LD */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Forside",
              item: "https://phonespot.dk",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Blog",
              item: "https://phonespot.dk/blog",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: frontmatter.title,
              item: `https://phonespot.dk/blog/${frontmatter.slug}`,
            },
          ],
        }}
      />

      {/* Hero with image */}
      <section className="relative overflow-hidden bg-charcoal">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          {/* Text side */}
          <div className="flex flex-col justify-center px-4 py-16 md:py-20 md:pr-12 lg:py-24 lg:pr-16">
            {/* Breadcrumb nav */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-white/50">
              <Link href="/" className="transition-colors hover:text-white">
                Forside
              </Link>
              <span>/</span>
              <Link href="/blog" className="transition-colors hover:text-white">
                Blog
              </Link>
              <span>/</span>
              <span className="line-clamp-1 text-white/70">
                {frontmatter.title}
              </span>
            </nav>

            <div className="flex items-center gap-3">
              <CategoryBadge category={frontmatter.category} />
              <time
                dateTime={frontmatter.date}
                className="text-sm text-white/40"
              >
                {formatDate(frontmatter.date)}
              </time>
            </div>

            <h1 className="mt-4 font-display text-3xl font-extrabold italic leading-tight text-white md:text-4xl lg:text-5xl">
              {frontmatter.title}
            </h1>

            <p className="mt-4 max-w-lg font-body text-base leading-relaxed text-white/60">
              {frontmatter.description}
            </p>
          </div>

          {/* Image side */}
          {frontmatter.coverImage && (
            <div className="relative hidden aspect-square md:block">
              <div className="absolute inset-0 bg-gradient-to-r from-charcoal to-transparent z-10" />
              <Image
                src={frontmatter.coverImage}
                alt={frontmatter.title}
                fill
                priority
                className="object-contain object-center p-12"
                sizes="50vw"
              />
            </div>
          )}
        </div>
      </section>

      {/* MDX content */}
      <SectionWrapper>
        <article
          className="prose prose-lg mx-auto max-w-3xl
            prose-headings:font-display prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-charcoal
            prose-a:text-[#5A8C6F] prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-[#4a7a5e]
            prose-li:marker:text-[#5A8C6F]
            prose-strong:text-charcoal
            prose-p:text-charcoal/80 prose-p:font-body prose-p:leading-relaxed
            prose-li:text-charcoal/80 prose-li:font-body"
        >
          <MDXRemote source={content} />
        </article>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper background="green" className="!py-16">
        <div className="text-center">
          <Heading as="h2" size="md" className="!text-white">
            Klar til at finde din naeste enhed?
          </Heading>
          <p className="mx-auto mt-3 max-w-xl font-body text-white/70">
            Udforsk vores udvalg af kvalitetstestede refurbished iPhones med 36
            maaneders garanti.
          </p>
          <Link
            href="/iphones"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-charcoal transition-opacity hover:opacity-90"
          >
            Se iPhones
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </SectionWrapper>

      {/* Related articles */}
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
                {/* Card image */}
                <div className="relative aspect-[16/10] bg-warm-white">
                  {related.frontmatter.coverImage ? (
                    <Image
                      src={related.frontmatter.coverImage}
                      alt={related.frontmatter.title}
                      fill
                      className="object-contain object-center p-6 transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-green-eco/10" />
                    </div>
                  )}
                </div>

                {/* Card content */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <CategoryBadge category={related.frontmatter.category} />
                    <time
                      dateTime={related.frontmatter.date}
                      className="text-xs text-charcoal/50"
                    >
                      {formatDate(related.frontmatter.date)}
                    </time>
                  </div>

                  <h3 className="font-display text-lg font-bold text-charcoal transition-colors group-hover:text-[#5A8C6F]">
                    {related.frontmatter.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 flex-1 font-body text-sm leading-relaxed text-charcoal/60">
                    {related.frontmatter.description}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#5A8C6F]">
                    Laes mere
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                      />
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
