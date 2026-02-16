import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt os | PhoneSpot",
  description:
    "Har du spørgsmål? Kontakt PhoneSpot via vores kontaktformular eller på info@phonespot.dk. Vi svarer inden for 24 timer.",
};

export default function KontaktPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <h1 className="mb-3 font-display text-3xl font-extrabold italic text-charcoal md:text-4xl">
        Kontakt os
      </h1>
      <p className="mb-10 max-w-2xl text-gray">
        Har du spørgsmål til en ordre, et produkt eller vores reparationsservice?
        Udfyld formularen herunder, eller kontakt os direkte på e-mail. Vi
        bestræber os på at svare inden for 24 timer.
      </p>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Contact form */}
        <div className="lg:col-span-2">
          <form
            action="#"
            method="POST"
            className="rounded-[16px] border border-sand bg-white p-6 md:p-8"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-semibold text-charcoal"
                >
                  Navn
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Dit fulde navn"
                  className="w-full rounded-lg border border-sand bg-white px-4 py-3 focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-semibold text-charcoal"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="din@email.dk"
                  className="w-full rounded-lg border border-sand bg-white px-4 py-3 focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="subject"
                className="mb-1.5 block text-sm font-semibold text-charcoal"
              >
                Emne
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                placeholder="Hvad handler din henvendelse om?"
                className="w-full rounded-lg border border-sand bg-white px-4 py-3 focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none"
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-semibold text-charcoal"
              >
                Besked
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                placeholder="Skriv din besked her..."
                className="w-full resize-none rounded-lg border border-sand bg-white px-4 py-3 focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none"
              />
            </div>

            <div className="mt-8">
              <button
                type="submit"
                className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Send besked
              </button>
            </div>
          </form>
        </div>

        {/* Side info card */}
        <div className="lg:col-span-1">
          <div className="rounded-[16px] border border-sand bg-white p-6 md:p-8">
            <h2 className="mb-6 font-display text-xl font-bold italic text-charcoal">
              Kontaktoplysninger
            </h2>

            <div className="flex flex-col gap-6">
              {/* Email */}
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">Email</p>
                  <a
                    href="mailto:info@phonespot.dk"
                    className="text-sm text-green-eco hover:underline"
                  >
                    info@phonespot.dk
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">Adresse</p>
                  <p className="text-sm text-gray">
                    PhoneSpot ApS
                    <br />
                    Danmark
                  </p>
                </div>
              </div>

              {/* Opening hours */}
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">
                    Åbningstider
                  </p>
                  <p className="text-sm text-gray">
                    Mandag - Fredag: 9:00 - 16:00
                    <br />
                    Weekend: Lukket
                  </p>
                </div>
              </div>
            </div>

            {/* Response time note */}
            <div className="mt-8 rounded-lg bg-green-pale p-4">
              <p className="text-sm text-charcoal">
                Vi bestræber os på at svare på alle henvendelser inden for{" "}
                <span className="font-semibold">24 timer</span> på hverdage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
