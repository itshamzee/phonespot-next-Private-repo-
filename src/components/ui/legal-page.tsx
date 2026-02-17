import { Heading } from "@/components/ui/heading";
import { SectionWrapper } from "@/components/ui/section-wrapper";

type LegalSection = {
  title: string;
  content: string;
};

type LegalPageProps = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-3xl">
        <Heading size="lg">{title}</Heading>
        <p className="mt-2 text-sm text-gray">Sidst opdateret: {lastUpdated}</p>

        <div className="mt-10 space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="font-display text-xl font-bold text-charcoal">
                {section.title}
              </h2>
              <p className="mt-3 leading-relaxed text-charcoal/80">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
