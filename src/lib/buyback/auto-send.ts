import type { LeadSuggestion } from "./suggest";
import type { BuybackSettings } from "./types";

export interface AutoSendDecision {
  send: boolean;
  reason: string; // Danish, always populated — it gets logged either way
}

// The safety envelope. Every condition must hold. Falling outside it is not an
// error: it is a lead for the manual queue, and the reason says which one.
export function shouldAutoSend(
  suggestion: LeadSuggestion,
  deviceCount: number,
  settings: BuybackSettings,
): AutoSendDecision {
  if (!settings.autoSendEnabled) {
    return { send: false, reason: "Automatikken er slået fra" };
  }
  if (settings.pausedReason) {
    return { send: false, reason: `Automatikken er på pause: ${settings.pausedReason}` };
  }
  if (suggestion.status !== "ok") {
    return { send: false, reason: suggestion.manualReason ?? "Kunne ikke prissættes" };
  }
  // An offer is a single amount; a lead with several devices is far too easy to
  // get wrong without a person looking at it.
  if (deviceCount !== 1) {
    return { send: false, reason: "Henvendelsen rummer flere enheder" };
  }
  if (suggestion.totalAimOre <= 0) {
    return { send: false, reason: "Beregnet bud er nul" };
  }
  if (suggestion.totalAimOre > settings.autoSendMaxOre) {
    return {
      send: false,
      reason: `Bud over loftet (${Math.round(settings.autoSendMaxOre / 100)} kr)`,
    };
  }
  return { send: true, reason: "Inden for sikkerhedsrammen" };
}
