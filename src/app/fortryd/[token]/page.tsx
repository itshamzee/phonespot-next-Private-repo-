import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { validateWithdrawalToken } from "@/lib/withdrawal";
import { WithdrawalForm } from "./withdrawal-form";

export const metadata: Metadata = {
  title: "Fortryd din ordre - PhoneSpot",
  description: "Udøv din 14-dages fortrydelsesret på din PhoneSpot-ordre.",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function WithdrawalPage({ params }: Props) {
  const { token } = await params;
  const order = await validateWithdrawalToken(token);

  if (!order) {
    notFound();
  }

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl">
        <Heading size="lg">Fortryd din ordre</Heading>

        <div className="mt-8 rounded-xl border border-charcoal/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-charcoal">
            Ordre #{order.order_number}
          </h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Bestilt den {new Date(order.created_at).toLocaleDateString("da-DK", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-sm text-charcoal/60">
            Total: {(order.total / 100).toLocaleString("da-DK", {
              style: "currency",
              currency: "DKK",
            })}
          </p>
        </div>

        {order.eligible ? (
          <div className="mt-6">
            <div className="rounded-xl border border-green-eco/20 bg-green-eco/5 p-4">
              <p className="text-sm text-charcoal/80">
                Du har <strong>{order.daysRemaining ?? 0} dag{(order.daysRemaining ?? 0) !== 1 ? "e" : ""}</strong> tilbage
                af din 14-dages fortrydelsesret.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="font-display text-base font-bold text-charcoal">
                Ønsker du at fortryde dit køb?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">
                Ved at klikke nedenfor meddeler du PhoneSpot, at du ønsker at gøre
                fortrydelsesretten gældende. Du vil modtage en bekræftelse på e-mail
                med returinstruktioner.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">
                <strong>Bemærk:</strong> Returomkostninger afholdes af dig som køber.
                Tilbagebetaling sker senest 14 dage efter vi har modtaget din
                fortrydelsesmeddelelse, dog tidligst når varen er modtaget retur.
              </p>
            </div>

            <WithdrawalForm token={token} orderNumber={order.order_number} />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-50 p-6">
            <h3 className="font-display text-base font-bold text-charcoal">
              Fortrydelsesretten kan ikke udøves
            </h3>
            <p className="mt-2 text-sm text-charcoal/80">
              {order.reason}
            </p>
            <p className="mt-4 text-sm text-charcoal/60">
              Har du spørgsmål? Kontakt os på{" "}
              <a href="mailto:info@phonespot.dk" className="text-green-eco underline">
                info@phonespot.dk
              </a>
            </p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
