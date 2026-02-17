import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Privatlivspolitik - PhoneSpot",
  description:
    "Læs om hvordan PhoneSpot håndterer dine personlige data og beskytter dit privatliv.",
};

const sections = [
  {
    title: "Dataansvarlig",
    content:
      "PhoneSpot er dataansvarlig for behandlingen af de personoplysninger, som vi modtager om dig. Vi er en dansk virksomhed og overholder gældende dansk og europæisk lovgivning om databeskyttelse (GDPR). Har du spørgsmål, kan du kontakte os på info@phonespot.dk.",
  },
  {
    title: "Hvilke data indsamler vi",
    content:
      "Når du afgiver en bestilling, indsamler vi dit navn, e-mailadresse, leveringsadresse og telefonnummer for at kunne behandle din ordre. Når du besøger vores hjemmeside, indsamler vi desuden cookies og brugsdata, herunder IP-adresse, browsertype og sidevisninger, for at kunne forbedre din oplevelse.",
  },
  {
    title: "Formål med behandling",
    content:
      "Vi behandler dine personoplysninger til følgende formål: ordrebehandling og levering, kundeservice og support, markedsføring (kun med dit samtykke) samt forbedring af vores hjemmeside og brugeroplevelse. Vi sælger aldrig dine data til tredjepart.",
  },
  {
    title: "Opbevaring",
    content:
      "Dine personoplysninger opbevares i op til 5 år i henhold til den danske bogføringslov. Samtykke til markedsføring opbevares, indtil du trækker det tilbage. Herefter slettes dine data sikkert fra vores systemer.",
  },
  {
    title: "Dine rettigheder",
    content:
      "Du har ret til indsigt i dine personoplysninger, ret til berigtigelse, ret til sletning og ret til dataportabilitet. Du kan til enhver tid gøre brug af dine rettigheder ved at kontakte os på info@phonespot.dk. Vi behandler din henvendelse hurtigst muligt og senest inden for 30 dage.",
  },
  {
    title: "Kontakt",
    content:
      "Har du spørgsmål til vores behandling af dine persondata, er du altid velkommen til at kontakte os på info@phonespot.dk. Vi bestræber os på at besvare alle henvendelser inden for 2 hverdage.",
  },
];

export default function PrivatlivspolitikPage() {
  return (
    <LegalPage
      title="Privatlivspolitik"
      lastUpdated="17. februar 2026"
      sections={sections}
    />
  );
}
