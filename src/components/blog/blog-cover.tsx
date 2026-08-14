import Image from "next/image";

/**
 * Blog cover on the warm product stage — the same visual system as the
 * device PDP gallery: cream radial stage, product photo multiplied onto it
 * (white backgrounds disappear), soft floor shadow. Posts without a photo
 * get a branded deep-green cover with a topic icon instead of a placeholder.
 */

type BlogCoverProps = {
  image?: string | null;
  title: string;
  slug: string;
  sizes: string;
  priority?: boolean;
  /** Extra padding steps for large surfaces (featured/hero). */
  padded?: boolean;
};

export function BlogCover({ image, title, slug, sizes, priority, padded }: BlogCoverProps) {
  if (!image) {
    return (
      <div className="relative h-full w-full bg-[#1A3D2E]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <TopicIcon slug={slug} />
          </span>
          <span className="px-6 text-center font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            PhoneSpot
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[radial-gradient(120%_100%_at_50%_0%,#FFFFFF_0%,#F6F2EA_55%,#ECE6D8_100%)]">
      <div
        aria-hidden="true"
        className="absolute bottom-[18%] left-1/2 h-6 w-1/2 -translate-x-1/2 rounded-[50%] bg-[#111111]/15 blur-xl"
      />
      <Image
        src={image}
        alt={title}
        fill
        priority={priority}
        className={`object-contain mix-blend-multiply ${padded ? "p-8 sm:p-12" : "p-6"}`}
        sizes={sizes}
      />
    </div>
  );
}

function TopicIcon({ slug }: { slug: string }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-7 w-7",
    "aria-hidden": true,
  };

  if (slug.includes("forsikring")) {
    return (
      <svg {...common}>
        <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    );
  }
  if (slug.includes("baeredygtig")) {
    return (
      <svg {...common}>
        <path d="M12 21c-4.5 0-8-3.5-8-8 0-6 5-9 13-10-1 8-4 13-10 13" />
        <path d="M4 21c3-3 6-5 10-6" />
      </svg>
    );
  }
  if (slug.includes("reparation")) {
    return (
      <svg {...common}>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}
