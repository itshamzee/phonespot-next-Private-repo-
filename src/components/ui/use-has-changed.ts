"use client";

import { useState } from "react";

/**
 * true, når værdien har været anderledes end ved første render.
 *
 * Bruges til at give pris, lager og billeder en kort overgang, når kunden
 * vælger noget, uden at noget animeres ved indlæsning. Kombinér med en ny
 * `key` på elementet, så animationen spiller ved hvert skift.
 */
export function useHasChanged<T>(value: T): boolean {
  const [initial] = useState(value);
  const [changed, setChanged] = useState(false);
  if (!changed && !Object.is(initial, value)) setChanged(true);
  return changed || !Object.is(initial, value);
}
