import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { BookingWizard } from "@/components/repair/booking-wizard";

export const metadata: Metadata = {
  title: "Book Reparation | PhoneSpot",
  description:
    "Book din reparation online. Vælg enhed, reparation og send din anmodning.",
  robots: { index: false },
};

export default function BookingPage() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <Heading as="h1" size="md">
            Book Reparation
          </Heading>
          <p className="mt-4 text-gray">
            Vælg din enhed og reparation herunder.
          </p>
        </div>
        <Suspense
          fallback={<p className="text-center text-gray">Indlæser...</p>}
        >
          <BookingWizard />
        </Suspense>
      </div>
    </SectionWrapper>
  );
}
