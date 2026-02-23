import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Handelsbetingelser - PhoneSpot",
  description:
    "Læs PhoneSpots handelsbetingelser for køb af refurbished iPhones og iPads.",
};

const sections = [
  {
    title: "Generelt",
    content:
      "Disse handelsbetingelser gælder for alle køb foretaget på phonespot.dk. Ved at gennemføre et køb accepterer du disse betingelser. PhoneSpot forbeholder sig retten til at opdatere betingelserne uden forudgående varsel.",
  },
  {
    title: "Priser",
    content:
      "Alle priser på phonespot.dk er angivet i danske kroner (DKK) inklusive 25% moms. Priserne kan ændres uden forudgående varsel, men ændringer påvirker ikke allerede afgivne ordrer. Eventuelle trykfejl i priser tages forbehold for.",
  },
  {
    title: "Betaling",
    content:
      "Vi accepterer betaling med Visa, Mastercard og MobilePay. Alle betalinger behandles sikkert gennem vores betalingsgateway, og vi gemmer aldrig dine kortoplysninger. Beløbet trækkes først, når din ordre afsendes.",
  },
  {
    title: "Levering",
    content:
      "Vi sender din ordre inden for 1-3 hverdage efter modtaget betaling. Fragt er gratis ved køb over 500 kr. Standard fragt koster 49 kr. Vi leverer med GLS eller PostNord, og du modtager et Track & Trace-nummer, når din pakke afsendes.",
  },
  {
    title: "Fortrydelsesret",
    content:
      "Du har 14 dages fortrydelsesret i henhold til den danske forbrugeraftaleloven. Fortrydelsesfristen løber fra den dag, du modtager varen. Produktet skal returneres i original stand og emballage. Returomkostninger afholdes af køberen. Refundering sker inden for 14 dage efter modtagelse af returneret vare.",
  },
  {
    title: "Reklamation",
    content:
      "Du har 24 måneders reklamationsret i henhold til den danske købelov. Reklamationsretten dækker fejl og mangler, som var til stede på leveringstidspunktet. Kontakt os på info@phonespot.dk for at gøre brug af din reklamationsret.",
  },
  {
    title: "Garanti",
    content:
      "PhoneSpot tilbyder 36 måneders egen garanti på alle refurbished produkter. Garantien dækker fabrikationsfejl og funktionelle mangler, der ikke skyldes forkert brug, uheld eller slitage. Kontakt vores kundeservice for garantisager.",
  },
];

export default function HandelsbetingelserPage() {
  return (
    <LegalPage
      title="Handelsbetingelser"
      lastUpdated="17. februar 2026"
      sections={sections}
    />
  );
}
