/**
 * Fallback Trustpilot rating, used ONLY when the live API
 * (src/lib/trustpilot/client.ts) is unavailable. Verified 4.8 on 2026-08-04.
 * Update here — never inline a rating anywhere else.
 */
export const TRUSTPILOT_FALLBACK_SCORE = 4.8;
export const TRUSTPILOT_SCORE_LABEL = TRUSTPILOT_FALLBACK_SCORE.toFixed(1); // "4.8"
export const TRUSTPILOT_SCORE_LABEL_DA = TRUSTPILOT_SCORE_LABEL.replace(".", ","); // "4,8"
