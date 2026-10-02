// Programmatisk fokus og indholdsskift må ikke rykke siden. Fokus sættes
// altid med preventScroll, og vi scroller kun, når toppen af det nye indhold
// ligger uden for skærmen — så kunden ikke mister sin plads i flowet.
export function focusWithoutScroll(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true });
}

export function revealTop(el: HTMLElement | null | undefined, offset = 16) {
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  if (top >= 0 && top < window.innerHeight * 0.75) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: window.scrollY + top - offset, behavior: reduce ? "auto" : "smooth" });
}
