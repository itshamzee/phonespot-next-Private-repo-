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
      "Refurbished vs Brugt vs Ny \— Hvad skal du v\ælge? | PhoneSpot",
    metaDescription:
      "Sammenlign refurbished, brugt og ny elektronik. Se forskelle i pris, garanti, kvalitet og milj\øp\åvirkning.",
    competitor: "Brugt / Ny",
    intro:
      "N\år du skal k\øbe en ny telefon, tablet eller b\ærbar, har du grundl\æggende tre muligheder: k\øbe helt nyt, k\øbe brugt fra en privatperson eller v\ælge refurbished. Alle tre har fordele og ulemper. Et nyt produkt er ubrugt og har fuld producentgaranti, men det er ogs\å den dyreste mulighed og har den st\ørste milj\øp\åvirkning. Brugte produkter fra private s\ælgere er billige, men du f\år sj\ældent garanti eller kvalitetssikring. Refurbished er mellempunktet: professionelt testede og klargjorte enheder med garanti, til en pris der ligger markant under nyt. Herunder sammenligner vi de tre k\øbsmuligheder, s\å du kan tr\æffe et informeret valg.",
    rows: [
      {
        feature: "Pris",
        phonespot: "20\u201340% under ny",
        competitor: "Brugt: 30\u201360% under ny / Ny: Fuld pris",
      },
      {
        feature: "Garanti",
        phonespot: "Op til 36 m\åneder",
        competitor: "Brugt: Sj\ældent / Ny: 24 mdr. fra producent",
      },
      {
        feature: "Kvalitetstest",
        phonespot: "Ja, 30+ tests",
        competitor: "Brugt: Nej / Ny: Fabriksny",
      },
      {
        feature: "Milj\øp\åvirkning",
        phonespot: "Lavt CO\u2082-aftryk",
        competitor: "Brugt: Lavt CO\u2082 / Ny: H\øjt CO\u2082-aftryk",
      },
      {
        feature: "Risiko",
        phonespot: "Lav \— testet og garanteret",
        competitor: "Brugt: H\øj / Ny: Ingen",
      },
      {
        feature: "Udvalg",
        phonespot: "Godt \— popul\ære modeller",
        competitor: "Brugt: Varierer / Ny: Alt tilg\ængeligt",
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
      "Refurbished er det optimale mellempunkt for de fleste forbrugere. Du f\år en professionelt testet enhed i kendt tilstand med op til 36 m\åneders garanti \— til en pris der typisk ligger 20\u201340% under nyt. Samtidig g\ør du et aktivt valg for milj\øet ved at forl\ænge enhedens levetid. K\øb af brugt fra private kan v\ære billigere, men risikoen er h\øj, og du st\år uden garanti. Nyt er det sikreste valg kvalitetsm\æssigt, men du betaler fuld pris og bidrager til h\øjere CO\u2082-udledning. Med refurbished fra PhoneSpot f\år du det bedste fra begge verdener.",
    faq: [
      {
        question: "Hvad er forskellen p\å refurbished og brugt?",
        answer:
          "En refurbished enhed er professionelt inspiceret, testet med 30+ tests, rengjort og klargjort af teknikere, og leveres med garanti. En brugt enhed s\ælges som den er \— typisk af en privatperson \— uden kvalitetssikring eller garanti.",
      },
      {
        question: "Er refurbished enheder lige s\å gode som nye?",
        answer:
          "Funktionelt ja. Alle refurbished enheder fra PhoneSpot gennemg\år 30+ tests for at sikre, at de fungerer som nye. Kosmetisk kan der v\ære lette brugstegn afh\ængigt af graderingen (A, B eller C), men funktionaliteten er fuldt p\å h\øjde med nye enheder.",
      },
      {
        question: "Hvor meget kan jeg spare med refurbished?",
        answer:
          "Typisk sparer du mellem 20% og 40% sammenlignet med nyprisen. P\å \ældre modeller kan besparelsen v\ære endnu st\ørre. Med PhoneSpots prismatch-garanti er du desuden sikret den bedste pris p\å markedet.",
      },
      {
        question: "Er refurbished bedre for milj\øet?",
        answer:
          "Ja, markant. Ved at v\ælge refurbished forl\ænger du enhedens levetid og undg\år den CO\u2082-udledning, der er forbundet med at producere en helt ny enhed. Produktionen af en ny smartphone udleder ca. 70 kg CO\u2082, hvilket du sparer ved at v\ælge refurbished.",
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
