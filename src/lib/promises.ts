/**
 * PhoneSpots 6 løfter (ejerbeslutning 2026-10-29). Én kilde til /garanti,
 * forsiden og llms.txt, så formuleringen er ens overalt. Ret kun her.
 */
export type BrandPromise = {
  title: string;
  detail: string;
  href: string;
};

export const PHONESPOT_PROMISES: BrandPromise[] = [
  {
    title: "Vi oplyser delstatus",
    detail:
      "Du får at vide, om skærm og batteri er originale eller skiftet, før du køber.",
    href: "/garanti#loefter",
  },
  {
    title: "Batteri min. 90 % ved levering",
    detail:
      "Har en enhed fra os under 90 % batterikapacitet ved levering, skifter vi batteriet uden beregning.",
    href: "/garanti#loefter",
  },
  {
    title: "Garantisag over disken samme dag",
    detail:
      "Kom ind i Vejle eller Slagelse. Kan vi ikke løse sagen samme dag, får du en lånetelefon.",
    href: "/garanti#loefter",
  },
  {
    title: "36 måneders garanti og 30 dages returret",
    detail:
      "36 måneders garanti på enheder og 30 dages returret. Tilbehør har 2 års reklamationsret.",
    href: "/garanti",
  },
  {
    title: "Fast opkøbspris",
    detail:
      "Sælger du din enhed, holder prisen, medmindre enheden afviger fra din beskrivelse. Udbetaling inden 2 hverdage, og gratis retur hvis du afviser.",
    href: "/saelg-din-enhed",
  },
  {
    title: "Eget værksted, åbne priser",
    detail:
      "Livstidsgaranti på arbejde og dele ved reparation af telefon og tablet, og alle priser står på siden.",
    href: "/reparation",
  },
];

/** Én sætning, som AI-søgning og presse kan citere direkte. */
export const PHONESPOT_ONE_LINER =
  "PhoneSpot er en dansk forhandler af brugte og refurbished iPhones, iPads og bærbare med 36 måneders garanti og eget reparationsværksted i Vejle og Slagelse.";
