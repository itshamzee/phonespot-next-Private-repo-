import Link from "next/link";
import { Heading } from "@/components/ui/heading";

type GuideLink = {
  href: string;
  title: string;
  description: string;
};

type RelatedGuidesProps = {
  guides: GuideLink[];
  heading?: string;
};

export function RelatedGuides({
  guides,
  heading = "Relaterede guides",
}: RelatedGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <div className="mx-auto max-w-3xl text-center">
      <Heading as="h2" size="sm">
        {heading}
      </Heading>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
          >
            <p className="font-display text-sm font-bold text-charcoal">
              {guide.title}
            </p>
            <p className="mt-1 text-xs text-gray">{guide.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
