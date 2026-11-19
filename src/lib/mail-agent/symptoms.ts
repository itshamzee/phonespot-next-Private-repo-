import type { ToolContext } from "./tools";

export interface SymptomRow {
  key: string;
  label: string;
  /** service_category values, most likely first. */
  categories: string[];
  /** One sentence the customer can be given. */
  advice: string;
  /** true = recommend free diagnosis over the counter, promise no price. */
  needsDiagnosis: boolean;
}

/**
 * Curated fault-to-repair table. Customer-facing Danish: du-form, no emojis,
 * never advise opening the device or home remedies. Every categories value must
 * exist in SUMMARY_CATEGORIES (src/lib/repairs/price-list.ts).
 */
export const SYMPTOMS: SymptomRow[] = [
  {
    key: "sort_skaerm",
    label: "Sort skærm, men telefonen reagerer (ringer, vibrerer)",
    categories: ["Skærmskift"],
    advice: "Når telefonen stadig ringer eller vibrerer, er det oftest skærmen, der er gået, og den kan skiftes.",
    needsDiagnosis: false,
  },
  {
    key: "revnet_skaerm",
    label: "Revnet eller knust skærm",
    categories: ["Skærmskift"],
    advice: "En revnet skærm kan skiftes, og det er en god idé at gøre det hurtigt, så fugt og snavs ikke trænger ind.",
    needsDiagnosis: false,
  },
  {
    key: "touch_virker_ikke",
    label: "Touch virker ikke eller reagerer forkert",
    categories: ["Skærmskift"],
    advice: "Når touchen ikke reagerer, er det typisk skærmen, der skal skiftes.",
    needsDiagnosis: false,
  },
  {
    key: "streger_pletter_skaerm",
    label: "Streger, pletter eller farvefejl på skærmen",
    categories: ["Skærmskift"],
    advice: "Streger og pletter i billedet skyldes næsten altid en defekt skærm, som kan skiftes.",
    needsDiagnosis: false,
  },
  {
    key: "batteri_toemmes",
    label: "Batteriet holder ikke eller tømmes hurtigt",
    categories: ["Batteriskift"],
    advice: "Et slidt batteri kan skiftes, så du får en normal batteritid igen.",
    needsDiagnosis: false,
  },
  {
    key: "slukker_selv",
    label: "Telefonen slukker eller genstarter af sig selv",
    categories: ["Batteriskift"],
    advice: "Det kan være batteriet, men årsagen kan også være en anden, så vi anbefaler at få den undersøgt.",
    needsDiagnosis: true,
  },
  {
    key: "lader_ikke",
    label: "Telefonen vil ikke oplade",
    categories: ["Opladerstik", "Batteriskift"],
    advice: "Prøv først et andet kabel og en anden oplader, og rens stikket forsigtigt; hjælper det ikke, er det typisk opladerstikket eller batteriet.",
    needsDiagnosis: false,
  },
  {
    key: "revnet_bagside",
    label: "Revnet eller knust bagside",
    categories: ["Bagglas"],
    advice: "Bagglasset kan skiftes, så bagsiden bliver tæt og pæn igen.",
    needsDiagnosis: false,
  },
  {
    key: "kamera_sloeret",
    label: "Kameraet er sløret, har pletter eller virker ikke",
    categories: ["Kamera"],
    advice: "Er billedet sløret eller har pletter, kan kameraet eller dets linse skiftes.",
    needsDiagnosis: false,
  },
  {
    key: "ingen_lyd_mikrofon",
    label: "Ingen lyd, eller andre kan ikke høre dig (højttaler eller mikrofon)",
    categories: [],
    advice: "Fejl på lyd og mikrofon kan have flere årsager, så den skal undersøges, før vi kan sige, hvad der skal gøres.",
    needsDiagnosis: true,
  },
  {
    key: "vandskade",
    label: "Vandskade eller væske på telefonen",
    categories: [],
    advice: "Sluk enheden, oplad den ikke, og kom ind til os hurtigst muligt, så vi kan undersøge den.",
    needsDiagnosis: true,
  },
  {
    key: "taender_ikke",
    label: "Telefonen tænder slet ikke",
    categories: [],
    advice: "Når en telefon ikke tænder, kan årsagen kun findes ved en undersøgelse.",
    needsDiagnosis: true,
  },
  {
    key: "andet",
    label: "Andre eller uklare fejl",
    categories: [],
    advice: "Med en uklar fejl er det bedst, at vi ser på enheden, før vi vurderer reparationen.",
    needsDiagnosis: true,
  },
];

export async function diagnoseImpl(ctx: ToolContext, input: { symptom_key: string }): Promise<string> {
  const row = SYMPTOMS.find((s) => s.key === input.symptom_key);
  ctx.log.push({ tool: "diagnose", input, hits: row ? 1 : 0 });
  if (!row) return "Ukendt symptom. Vælg 'andet' og anbefal gratis diagnose over disken i butikken.";

  const lines = [`Symptom: ${row.label}.`];
  if (row.categories.length) lines.push(`Sandsynlig reparation: ${row.categories.join(", ")}.`);
  lines.push(`Råd til kunden: ${row.advice}`);
  if (row.needsDiagnosis) {
    lines.push(
      "Anbefal gratis diagnose over disken i butikken (Vejle eller Slagelse). Lov ingen pris og ingen sikker årsag.",
    );
  } else {
    for (const c of row.categories) lines.push(`Kald quote_repair med kategori ${c} for pris.`);
  }
  return lines.join("\n");
}
