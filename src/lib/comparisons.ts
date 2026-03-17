export type ComparisonRow = {
  feature: string;
  phonespot: string;
  competitor: string;
};

export type ComparisonFaq = {
  question: string;
  answer: string;
};

export type Comparison = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  competitor: string;
  intro: string;
  image: string;
  rows: ComparisonRow[];
  verdict: string;
  faq: ComparisonFaq[];
};

export const COMPARISONS: Comparison[] = [
  /* ------------------------------------------------------------------
   * 1. Refurbished vs Brugt vs Ny
   * ------------------------------------------------------------------ */
  {
    slug: "refurbished-vs-brugt-vs-ny",
    title: "Refurbished vs Brugt vs Ny",
    image: "/quality/grade-a.png",
    metaTitle:
      "Refurbished vs Brugt vs Ny \— Hvad skal du vælge? | PhoneSpot",
    metaDescription:
      "Sammenlign refurbished, brugt og ny elektronik. Se forskelle i pris, garanti, kvalitet og miljøpåvirkning.",
    competitor: "Brugt / Ny",
    intro:
      "Når du skal købe en ny telefon, tablet eller bærbar, har du grundlæggende tre muligheder: købe helt nyt, købe brugt fra en privatperson eller vælge refurbished. Alle tre har fordele og ulemper. Et nyt produkt er ubrugt og har fuld producentgaranti, men det er også den dyreste mulighed og har den største miljøpåvirkning. Brugte produkter fra private sælgere er billige, men du får sjældent garanti eller kvalitetssikring. Refurbished er mellempunktet: professionelt testede og klargjorte enheder med garanti, til en pris der ligger markant under nyt. Herunder sammenligner vi de tre købsmuligheder, så du kan træffe et informeret valg.",
    rows: [
      {
        feature: "Pris",
        phonespot: "20\u201340% under ny",
        competitor: "Brugt: 30\u201360% under ny / Ny: Fuld pris",
      },
      {
        feature: "Garanti",
        phonespot: "Op til 36 måneder",
        competitor: "Brugt: Sjældent / Ny: 24 mdr. fra producent",
      },
      {
        feature: "Kvalitetstest",
        phonespot: "Ja, 30+ tests",
        competitor: "Brugt: Nej / Ny: Fabriksny",
      },
      {
        feature: "Miljøpåvirkning",
        phonespot: "Lavt CO\u2082-aftryk",
        competitor: "Brugt: Lavt CO\u2082 / Ny: Højt CO\u2082-aftryk",
      },
      {
        feature: "Risiko",
        phonespot: "Lav \— testet og garanteret",
        competitor: "Brugt: Høj / Ny: Ingen",
      },
      {
        feature: "Udvalg",
        phonespot: "Godt \— populære modeller",
        competitor: "Brugt: Varierer / Ny: Alt tilgængeligt",
      },
      {
        feature: "Returret",
        phonespot: "14 dage",
        competitor: "Brugt: Varierer / Ny: 14 dage",
      },
      {
        feature: "Tilstand",
        phonespot: "Testet og graded (A/B/C)",
        competitor: "Brugt: Ukendt / Ny: Perfekt",
      },
    ],
    verdict:
      "Refurbished er det optimale mellempunkt for de fleste forbrugere. Du får en professionelt testet enhed i kendt tilstand med op til 36 måneders garanti \— til en pris der typisk ligger 20\u201340% under nyt. Samtidig gør du et aktivt valg for miljøet ved at forlænge enhedens levetid. Køb af brugt fra private kan være billigere, men risikoen er høj, og du står uden garanti. Nyt er det sikreste valg kvalitetsmæssigt, men du betaler fuld pris og bidrager til højere CO\u2082-udledning. Med refurbished fra PhoneSpot får du det bedste fra begge verdener.",
    faq: [
      {
        question: "Hvad er forskellen på refurbished og brugt?",
        answer:
          "En refurbished enhed er professionelt inspiceret, testet med 30+ tests, rengjort og klargjort af teknikere, og leveres med garanti. En brugt enhed sælges som den er \— typisk af en privatperson \— uden kvalitetssikring eller garanti.",
      },
      {
        question: "Er refurbished enheder lige så gode som nye?",
        answer:
          "Funktionelt ja. Alle refurbished enheder fra PhoneSpot gennemgår 30+ tests for at sikre, at de fungerer som nye. Kosmetisk kan der være lette brugstegn afhængigt af graderingen (A, B eller C), men funktionaliteten er fuldt på højde med nye enheder.",
      },
      {
        question: "Hvor meget kan jeg spare med refurbished?",
        answer:
          "Typisk sparer du mellem 20% og 40% sammenlignet med nyprisen. På ældre modeller kan besparelsen være endnu større. Med PhoneSpots prismatch-garanti er du desuden sikret den bedste pris på markedet.",
      },
      {
        question: "Er refurbished bedre for miljøet?",
        answer:
          "Ja, markant. Ved at vælge refurbished forlænger du enhedens levetid og undgår den CO\u2082-udledning, der er forbundet med at producere en helt ny enhed. Produktionen af en ny smartphone udleder ca. 70 kg CO\u2082, hvilket du sparer ved at vælge refurbished.",
      },
    ],
  },
];

export function getComparison(slug: string): Comparison | null {
  return COMPARISONS.find((c) => c.slug === slug) ?? null;
}

export function getAllComparisonSlugs(): { slug: string }[] {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}
