import { estimateGuidePrice } from "@/lib/buyback/guide-price-server";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import type { BuybackCondition, BuybackDevice } from "@/lib/buyback/types";
import type { ToolContext } from "./tools";

const SELL_URL = "https://phonespot.dk/saelg-din-enhed";

const TECHNICAL_FAILURE = "Prisopslaget fejlede teknisk. Oplys ingen pris, og lad en medarbejder tage over.";

/**
 * Input uses the exact strings the sell form stores (sell-device-wizard.tsx), so
 * the engine reads them the same way as for a customer who fills in the form.
 * Faults: only "Opladning" can be priced. Anything else is sent as "Andet",
 * which the engine refuses to price, so the customer is sent to the form.
 */
export interface QuoteBuybackInput {
  model: string;
  storage: string;
  screen: "Perfekt" | "Små ridser" | "Revnet" | "Virker ikke";
  back: "Perfekt" | "Små ridser" | "Revnet";
  battery: "God (80%+)" | "Okay (60-80%)" | "Dårligt (<60%)" | "Ved ikke";
  charging_broken: boolean;
  other_faults: boolean;
  cloud_locked: "Ja" | "Nej" | "Ved ikke";
}

export interface QuoteBuybackDeps {
  estimate?: typeof estimateGuidePrice;
  loadSettings?: typeof loadBuybackSettings;
}

function kroner(ore: number): string {
  return `${Math.round(ore / 100).toLocaleString("da-DK")} kr.`;
}

const FORM_FALLBACK = `Oplys ingen pris. Henvis kunden til sælg-formularen på ${SELL_URL}, hvor kunden får et tilbud inden for 24 timer.`;

export async function quoteBuybackImpl(ctx: ToolContext, input: QuoteBuybackInput, deps: QuoteBuybackDeps = {}): Promise<string> {
  const estimate = deps.estimate ?? estimateGuidePrice;
  const loadSettings = deps.loadSettings ?? loadBuybackSettings;

  const device: BuybackDevice = {
    deviceType: "Telefon",
    brand: "Apple",
    model: input.model,
    storage: input.storage,
    ram: "",
    useCustom: false,
    brandCustom: "",
    modelCustom: "",
  };
  const brokenParts = [...(input.charging_broken ? ["Opladning"] : []), ...(input.other_faults ? ["Andet"] : [])];
  const condition: BuybackCondition = {
    screen: input.screen,
    back: input.back,
    battery: input.battery,
    allWorking: brokenParts.length > 0 ? "Nej" : "Ja",
    brokenParts,
    cloudLocked: input.cloud_locked,
  };

  let result;
  try {
    // The tool context only carries a plain client; the engine's type is the admin client.
    const client = ctx.supabase as never;
    const settings = await loadSettings(client);
    result = await estimate(client, device, condition, settings, { ignoreSwitch: true });
  } catch (err) {
    console.error("quote_buyback failed", err);
    ctx.log.push({ tool: "quote_buyback", input: { ...input }, hits: 0 });
    return TECHNICAL_FAILURE;
  }

  if (result.status === "priced") {
    ctx.log.push({ tool: "quote_buyback", input: { ...input }, hits: 1 });
    return [
      `Vejledende opkøbspris: ${kroner(result.amountOre)}.`,
      "Sig tydeligt til kunden, at prisen er vejledende, og at det endelige tilbud først kommer, når vi har tjekket enheden.",
      `Kunden kan få et bindende tilbud via sælg-formularen: ${SELL_URL}.`,
    ].join("\n");
  }

  ctx.log.push({ tool: "quote_buyback", input: { ...input }, hits: 0 });
  if (result.reason === "iCloud-låst") {
    return `Vi køber ikke iCloud-låste enheder. Oplys ingen pris. Bed kunden fjerne låsen og derefter bruge sælg-formularen: ${SELL_URL}.`;
  }
  return FORM_FALLBACK;
}
