import type { Metadata } from "next";
import Link from "next/link";

import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { JsonLd } from "@/components/seo/json-ld";
import { BlogCover } from "@/components/blog/blog-cover";
import { getAllPosts } from "@/lib/blog";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Guides & Nyheder om Refurbished Elektronik | PhoneSpot Blog",
  description:
    "Læs guides, sammenligninger og nyheder om refurbished iPhones, iPads, MacBooks og mere. Bliv klogere på refurbished tech hos PhoneSpot.",
};

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      {/* Breadcrumb JSON-LD */}
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
          ],
        }}
      />

      {/* Hero */}
      <SectionWrapper className="!py-16 md:!py-20 !bg-[#1A3D2E]">
        <div className="text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-green-eco">
            PhoneSpot Blog
          </p>
          <Heading as="h1" size="lg" className="!text-white">
            Guides & Nyheder
          </Heading>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-white/70">
            Bliv klogere på refurbished elektronik. Købsguides,
            sammenligninger og tips fra vores eksperter.
          </p>
        </div>
      </SectionWrapper>

      {/* Featured post — full-bleed photo with overlaid title */}
      {featured && (
        <SectionWrapper className="!pb-0">
          <Link
            href={`/blog/${featured.frontmatter.slug}`}
            className="group relative block overflow-hidden rounded-3xl"
          >
            <div className="relative aspect-[4/3] sm:aspect-[16/8] md:aspect-[21/9]">
              <BlogCover
                image={featured.frontmatter.coverImage}
                title={featured.frontmatter.title}
                slug={featured.frontmatter.slug}
                sizes="(max-width: 1280px) 100vw, 1232px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
                <div className="flex items-center gap-3">
                  <CategoryBadge category={featured.frontmatter.category} />
                  <time
                    dateTime={featured.frontmatter.date}
                    className="text-xs font-medium text-white/70"
                  >
                    {formatDate(featured.frontmatter.date)}
                  </time>
                </div>
                <h2 className="mt-3 max-w-3xl font-display text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                  {featured.frontmatter.title}
                </h2>
                <p className="mt-3 hidden max-w-2xl font-body text-base leading-relaxed text-white/75 sm:line-clamp-2">
                  {featured.frontmatter.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  Læs guiden
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
            </div>
          </Link>
        </SectionWrapper>
      )}

      {/* Remaining posts grid */}
      {rest.length > 0 && (
        <SectionWrapper>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.frontmatter.slug}
                href={`/blog/${post.frontmatter.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-sand/50 bg-white transition-shadow hover:shadow-lg"
              >
                {/* Card image */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <BlogCover
                    image={post.frontmatter.coverImage}
                    title={post.frontmatter.title}
                    slug={post.frontmatter.slug}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {/* Card content */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <CategoryBadge category={post.frontmatter.category} />
                    <time
                      dateTime={post.frontmatter.date}
                      className="text-xs text-charcoal/50"
                    >
                      {formatDate(post.frontmatter.date)}
                    </time>
                  </div>

                  <h2 className="font-display text-xl font-bold text-charcoal transition-colors group-hover:text-[#1A3D2E]">
                    {post.frontmatter.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 flex-1 font-body text-sm leading-relaxed text-charcoal/60">
                    {post.frontmatter.description}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1A3D2E]">
                    Læs mere
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

      {/* Empty state */}
      {posts.length === 0 && (
        <SectionWrapper>
          <div className="py-16 text-center">
            <p className="font-display text-2xl font-bold text-charcoal">
              Kommer snart
            </p>
            <p className="mt-2 font-body text-charcoal/60">
              Vi arbejder på spændende guides og artikler. Kom tilbage snart!
            </p>
          </div>
        </SectionWrapper>
      )}
    </>
  );
}
