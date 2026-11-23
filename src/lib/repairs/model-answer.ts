import { countsTowardFromPrice } from "@/lib/repairs/from-price";
import { REPAIR_WARRANTY_ANSWER } from "@/lib/repairs/warranty-copy";
import { qualityLabel } from "@/components/repair/service-label";

/**
 * Svar-først-afsnit og FAQ til reparationssiderne pr. model
 * (/reparation/apple/iphone-15 osv.), undtagen konsoller, der har egen tekst.
 *
 * Bing AI Performance (aug.–nov. 2026): 74 % af PhoneSpots citationer i
 * Copilot gik til guides med et konkret svar, kun 6 % til reparationssiderne.
 * Modelsiderne havde en generisk intro ("Vælg, hvad vi skal hjælpe med") og en
 * generisk FAQ uden schema. Her bygges et svar og en FAQ pr. model ud fra de
 * samme services som kurv, prisliste og JSON-LD, så teksten aldrig lover en
 * pris, tid eller garanti, der ikke står i prislisten. Mangler data, udelades
 * sætningen eller spørgsmålet.
 */

export type ModelServiceLike = {
  name: string;
  slug: string;
  price_dkk: number;
  estimated_minutes: number | null;
  warranty_info: string | null;
  quality_tier: "standard" | "premium" | "original" | null;
  service_category: string | null;
};

export type ModelFaq = { question: string; answer: string };

export type ModelAnswer = { answer: string; faqs: ModelFaq[] };

const kr = (n: number) => `${n.toLocaleString("da-DK")} kr.`;

const label = (s: ModelServiceLike) =>
  `${s.service_category ?? ""} ${s.name} ${s.slug}`.toLocaleLowerCase("da-DK");

type Kind = { key: string; noun: string; pattern: RegExp };

// Rækkefølgen er den, kunderne spørger efter. Skærm og batteri får egne
// spørgsmål; resten samles i ét.
const KINDS: Kind[] = [
  { key: "screen", noun: "skærmskift", pattern: /sk(æ|ae)rm|display/ },
  { key: "battery", noun: "batteriskift", pattern: /batteri/ },
  { key: "back", noun: "nyt bagglas", pattern: /bagglas|bagside/ },
  { key: "port", noun: "nyt ladestik", pattern: /ladestik|ladeport|lade-?port/ },
  { key: "camera", noun: "kamerareparation", pattern: /kamera/ },
  { key: "speaker", noun: "ny højttaler", pattern: /h(ø|oe)jttaler/ },
  { key: "keyboard", noun: "nyt tastatur", pattern: /tastatur/ },
  { key: "topcase", noun: "ny topcase", pattern: /topcase/ },
  { key: "fan", noun: "ny blæser", pattern: /bl(æ|ae)ser/ },
  { key: "paste", noun: "ny kølepasta", pattern: /termisk|k(ø|oe)lepasta/ },
];

function servicesOf(services: ModelServiceLike[], kind: Kind) {
  return services.filter((s) => countsTowardFromPrice(s) && kind.pattern.test(label(s)));
}

function minPrice(list: ModelServiceLike[]): number | null {
  return list.length ? Math.min(...list.map((s) => s.price_dkk)) : null;
}

/** Kun når hver ydelse har en oplyst tid; ellers ville svaret love for lidt. */
function minutesRange(list: ModelServiceLike[]): [number, number] | null {
  const m = list.map((s) => s.estimated_minutes ?? 0);
  if (!m.length || m.some((x) => !(x > 0))) return null;
  return [Math.min(...m), Math.max(...m)];
}

/** Sætningsslut uden dobbelt punktum efter "kr." og "min.". */
const end = (t: string) => (t.endsWith(".") ? t : `${t}.`);

function rangeText([lo, hi]: [number, number]) {
  return lo === hi ? `ca. ${lo} min.` : `${lo}–${hi} min.`;
}

function joinDa(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
}

/** "Budget 899 kr., OEM 1.199 kr. og Original 1.799 kr." */
function tierLine(list: ModelServiceLike[]) {
  const sorted = [...list].sort((a, b) => a.price_dkk - b.price_dkk);
  // Kvaliteten i parentes i navnet ("Skærmskift (OEM)") er den sikre kilde.
  // Uden den bruges ydelsens navn, så to ydelser med samme tier ikke begge
  // hedder "Original".
  const parts = sorted.map((s) => {
    const q = /\(([^()]+)\)\s*$/.test(s.name) ? qualityLabel(s) : s.name;
    return `${q} ${kr(s.price_dkk)}`;
  });
  return joinDa(parts);
}

function hasWarranty(services: ModelServiceLike[], needle: string) {
  return services.some((s) => s.warranty_info?.toLocaleLowerCase("da-DK").includes(needle));
}

export function buildRepairModelAnswer(input: {
  modelName: string;
  deviceType: string;
  services: ModelServiceLike[];
  storeCities: string[];
}): ModelAnswer | null {
  const { modelName, deviceType, services, storeCities } = input;
  if (deviceType === "console") return null;
  const paid = services.filter((s) => countsTowardFromPrice(s));
  if (paid.length === 0) return null;

  const where = `hos PhoneSpot i ${joinDa(storeCities)}`;
  const screen = servicesOf(services, KINDS[0]);
  const battery = servicesOf(services, KINDS[1]);
  const lifetime = hasWarranty(paid, "livstid");
  const twelve = hasWarranty(paid, "12 måneders garanti");

  // Svaret: pris på det, folk søger efter, tid og garanti i tre sætninger.
  const priced = [
    screen.length ? `skærmskift fra ${kr(minPrice(screen)!)}` : null,
    battery.length ? `batteriskift fra ${kr(minPrice(battery)!)}` : null,
  ].filter((x): x is string => x != null);
  const sentences: string[] = [];
  if (priced.length) {
    sentences.push(end(`${modelName} reparation ${where}: ${joinDa(priced)}`));
  } else {
    sentences.push(`${modelName} reparation ${where} fra ${kr(minPrice(paid)!)}`);
  }
  const core = minutesRange(screen.length || battery.length ? [...screen, ...battery] : paid);
  const mailIn = deviceType !== "appliance";
  if (core) {
    const time = core[1] <= 120 ? `De fleste reparationer tager ${rangeText(core)}` : `Forventet tid er ${rangeText(core)}`;
    sentences.push(mailIn ? `${time} Du kan aflevere i butikken eller sende enheden ind med en gratis fragtlabel.` : time);
  }
  if (deviceType === "appliance") {
    if (twelve) sentences.push("Der er 12 måneders garanti på dele og arbejde.");
  } else if (lifetime) {
    sentences.push(
      battery.length
        ? "Der er livstidsgaranti på arbejde og dele, og 6 måneders garanti på batteriskift."
        : "Der er livstidsgaranti på arbejde og dele.",
    );
  }

  const faqs: ModelFaq[] = [];

  if (screen.length) {
    const t = minutesRange(screen);
    faqs.push({
      question: `Hvad koster skærmskift på ${modelName}?`,
      answer:
        `Skærmskift på ${modelName} koster fra ${kr(minPrice(screen)!)} ${where}.` +
        (screen.length > 1 ? ` Prisen afhænger af kvaliteten: ${end(tierLine(screen))}` : "") +
        (t ? ` Skiftet tager ${rangeText(t)}` : ""),
    });
  }
  if (battery.length) {
    const t = minutesRange(battery);
    faqs.push({
      question: `Hvad koster batteriskift på ${modelName}?`,
      answer:
        `Batteriskift på ${modelName} koster fra ${kr(minPrice(battery)!)} ${where}.` +
        (battery.length > 1 ? ` Prisen afhænger af kvaliteten: ${end(tierLine(battery))}` : "") +
        (t ? ` Skiftet tager ${rangeText(t)}` : "") +
        (deviceType !== "appliance" ? " Batteriskift har 6 måneders garanti." : ""),
    });
  }

  const others = KINDS.slice(2)
    .map((k) => ({ k, list: servicesOf(services, k) }))
    .filter((x) => x.list.length > 0)
    .map((x) => `${x.k.noun} fra ${kr(minPrice(x.list)!)}`);
  if (others.length) {
    faqs.push({
      question: `Hvad koster andre reparationer på ${modelName}?`,
      answer: `Ud over skærm og batteri laver vi blandt andet ${end(joinDa(others))} Hele prislisten med kvalitet og tid står på siden.`,
    });
  }

  const all = minutesRange(paid);
  if (all) {
    faqs.push({
      question: `Hvor lang tid tager en ${modelName} reparation?`,
      answer: `Forventet tid står ved hver reparation og ligger på ${rangeText(all)} for ${modelName}. Kommer du uden aftale, afhænger ventetiden af, hvor travlt værkstedet har, og om reservedelen er på lager.`,
    });
  }

  if (deviceType === "appliance") {
    if (twelve) {
      faqs.push({
        question: "Hvilken garanti er der på reparationen?",
        answer: "Reparation af husholdningsapparater har 12 måneders garanti på dele og arbejde.",
      });
    }
  } else if (lifetime) {
    faqs.push({
      question: `Hvilken garanti får jeg på en ${modelName} reparation?`,
      answer: REPAIR_WARRANTY_ANSWER,
    });
  }

  if (mailIn) faqs.push({
    question: `Kan jeg sende min ${modelName} ind til reparation?`,
    answer: `Ja. Book online og vælg at sende ind, så mailer vi en gratis fragtlabel. Du afleverer pakken i en pakkeshop, vi reparerer ${modelName} til den faste pris fra prislisten, kontakter dig, når den er færdig, og sender den tilbage. Garantien er den samme som i butikken.`,
  });

  if (deviceType !== "appliance") {
    faqs.push({
      question: "Skal jeg tage backup før reparationen?",
      answer:
        "Ja, vi anbefaler altid en backup. De fleste reparationer berører ikke dine data, men en backup sikrer dig, hvis enheden er skadet mere end det, man kan se udefra.",
    });
  }

  return { answer: sentences.join(" "), faqs };
}
