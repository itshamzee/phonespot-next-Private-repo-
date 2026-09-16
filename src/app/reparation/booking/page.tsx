import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookingWizard } from "@/components/repair/booking-wizard";
import styles from "@/components/repair/repair.module.css";
export const metadata: Metadata = {
  title: "Book reparation | PhoneSpot",
  description:
    "Book din reparation online. Vælg enhed, reparation og send din anmodning.",
  robots: { index: false },
};
export default function BookingPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Brødkrumme">
          <ol>
            <li>
              <Link href="/">Forside</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/reparation">Reparation</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Booking</li>
          </ol>
        </nav>
        <div className={styles.bookingWidth}>
          <header className={styles.bookingHeader}>
            <span className={styles.eyebrow}>Reparation hos PhoneSpot</span>
            <h1>Book din reparation.</h1>
            <p>
              Vælg enhed og reparation. Derefter vælger du, hvor og hvornår du
              vil aflevere.
            </p>
          </header>
          <Suspense
            fallback={
              <p role="status" className="py-8 text-gray">
                Indlæser booking...
              </p>
            }
          >
            <BookingWizard />
          </Suspense>
          <p className={styles.bookingHelp}>
            Brug for hjælp? <Link href="/kontakt">Kontakt os</Link>, eller find
            din butik i <Link href="/butik/vejle">Vejle</Link> eller{" "}
            <Link href="/butik/slagelse">Slagelse</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
