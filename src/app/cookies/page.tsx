import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Cookiepolitik - PhoneSpot",
  description:
    "Læs om PhoneSpots brug af cookies og hvordan du kan administrere dem.",
};

const sections = [
  {
    title: "Hvad er cookies",
    content:
      "Cookies er små tekstfiler, der gemmes på din enhed (computer, tablet eller telefon), når du besøger en hjemmeside. Cookies hjælper os med at forbedre din oplevelse på phonespot.dk ved at huske dine præferencer og forstå, hvordan du bruger vores side.",
  },
  {
    title: "Nødvendige cookies",
    content:
      "Nødvendige cookies er påkrævede for, at hjemmesiden kan fungere korrekt. De bruges til funktioner som indkøbskurv, brugersession og grundlæggende navigation. Disse cookies kan ikke deaktiveres, da siden ikke vil fungere uden dem.",
  },
  {
    title: "Analytiske cookies",
    content:
      "Analytiske cookies hjælper os med at forstå, hvordan besøgende bruger vores hjemmeside. De indsamler anonyme data om sidevisninger, besøgstid og navigeringsmønstre. Disse oplysninger bruger vi til at forbedre vores hjemmeside og indhold.",
  },
  {
    title: "Marketing cookies",
    content:
      "Marketing cookies bruges til at vise dig relevante annoncer baseret på dine interesser. Disse cookies sættes kun med dit samtykke og kan bruges af tredjepart som Facebook og Google til at målrette annoncer på tværs af hjemmesider.",
  },
  {
    title: "Sådan sletter du cookies",
    content:
      "Du kan til enhver tid slette eller blokere cookies via din browsers indstillinger. I de fleste browsere finder du indstillingerne under Privatliv eller Sikkerhed. Bemærk, at blokering af nødvendige cookies kan påvirke hjemmesidens funktionalitet. Du kan også trække dit samtykke tilbage ved at klikke på cookie-banneret nederst på siden.",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookiepolitik"
      lastUpdated="17. februar 2026"
      sections={sections}
    />
  );
}
