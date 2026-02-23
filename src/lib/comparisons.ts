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
      "Refurbished vs Brugt vs Ny \u2014 Hvad skal du v\u00e6lge? | PhoneSpot",
    metaDescription:
      "Sammenlign refurbished, brugt og ny elektronik. Se forskelle i pris, garanti, kvalitet og milj\u00f8p\u00e5virkning.",
    competitor: "Brugt / Ny",
    intro:
      "N\u00e5r du skal k\u00f8be en ny telefon, tablet eller b\u00e6rbar, har du grundl\u00e6ggende tre muligheder: k\u00f8be helt nyt, k\u00f8be brugt fra en privatperson eller v\u00e6lge refurbished. Alle tre har fordele og ulemper. Et nyt produkt er ubrugt og har fuld producentgaranti, men det er ogs\u00e5 den dyreste mulighed og har den st\u00f8rste milj\u00f8p\u00e5virkning. Brugte produkter fra private s\u00e6lgere er billige, men du f\u00e5r sj\u00e6ldent garanti eller kvalitetssikring. Refurbished er mellempunktet: professionelt testede og klargjorte enheder med garanti, til en pris der ligger markant under nyt. Herunder sammenligner vi de tre k\u00f8bsmuligheder, s\u00e5 du kan tr\u00e6ffe et informeret valg.",
    rows: [
      {
        feature: "Pris",
        phonespot: "20\u201340% under ny",
        competitor: "Brugt: 30\u201360% under ny / Ny: Fuld pris",
      },
      {
        feature: "Garanti",
        phonespot: "Op til 36 m\u00e5neder",
        competitor: "Brugt: Sj\u00e6ldent / Ny: 24 mdr. fra producent",
      },
      {
        feature: "Kvalitetstest",
        phonespot: "Ja, 30+ tests",
        competitor: "Brugt: Nej / Ny: Fabriksny",
      },
      {
        feature: "Milj\u00f8p\u00e5virkning",
        phonespot: "Lavt CO\u2082-aftryk",
        competitor: "Brugt: Lavt CO\u2082 / Ny: H\u00f8jt CO\u2082-aftryk",
      },
      {
        feature: "Risiko",
        phonespot: "Lav \u2014 testet og garanteret",
        competitor: "Brugt: H\u00f8j / Ny: Ingen",
      },
      {
        feature: "Udvalg",
        phonespot: "Godt \u2014 popul\u00e6re modeller",
        competitor: "Brugt: Varierer / Ny: Alt tilg\u00e6ngeligt",
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
      "Refurbished er det optimale mellempunkt for de fleste forbrugere. Du f\u00e5r en professionelt testet enhed i kendt tilstand med op til 36 m\u00e5neders garanti \u2014 til en pris der typisk ligger 20\u201340% under nyt. Samtidig g\u00f8r du et aktivt valg for milj\u00f8et ved at forl\u00e6nge enhedens levetid. K\u00f8b af brugt fra private kan v\u00e6re billigere, men risikoen er h\u00f8j, og du st\u00e5r uden garanti. Nyt er det sikreste valg kvalitetsm\u00e6ssigt, men du betaler fuld pris og bidrager til h\u00f8jere CO\u2082-udledning. Med refurbished fra PhoneSpot f\u00e5r du det bedste fra begge verdener.",
    faq: [
      {
        question: "Hvad er forskellen p\u00e5 refurbished og brugt?",
        answer:
          "En refurbished enhed er professionelt inspiceret, testet med 30+ tests, rengjort og klargjort af teknikere, og leveres med garanti. En brugt enhed s\u00e6lges som den er \u2014 typisk af en privatperson \u2014 uden kvalitetssikring eller garanti.",
      },
      {
        question: "Er refurbished enheder lige s\u00e5 gode som nye?",
        answer:
          "Funktionelt ja. Alle refurbished enheder fra PhoneSpot gennemg\u00e5r 30+ tests for at sikre, at de fungerer som nye. Kosmetisk kan der v\u00e6re lette brugstegn afh\u00e6ngigt af graderingen (A, B eller C), men funktionaliteten er fuldt p\u00e5 h\u00f8jde med nye enheder.",
      },
      {
        question: "Hvor meget kan jeg spare med refurbished?",
        answer:
          "Typisk sparer du mellem 20% og 40% sammenlignet med nyprisen. P\u00e5 \u00e6ldre modeller kan besparelsen v\u00e6re endnu st\u00f8rre. Med PhoneSpots prismatch-garanti er du desuden sikret den bedste pris p\u00e5 markedet.",
      },
      {
        question: "Er refurbished bedre for milj\u00f8et?",
        answer:
          "Ja, markant. Ved at v\u00e6lge refurbished forl\u00e6nger du enhedens levetid og undg\u00e5r den CO\u2082-udledning, der er forbundet med at producere en helt ny enhed. Produktionen af en ny smartphone udleder ca. 70 kg CO\u2082, hvilket du sparer ved at v\u00e6lge refurbished.",
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
