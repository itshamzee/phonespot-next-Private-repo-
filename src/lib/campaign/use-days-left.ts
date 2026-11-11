"use client";

import { useEffect, useState } from "react";
import { blackNovemberDaysLeftLabel } from "./black-november";

/**
 * "19 dage tilbage", regnet i browseren efter første render, så server og
 * klient ikke er uenige om datoen (null indtil da).
 */
export function useBlackNovemberDaysLeft(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setLabel(blackNovemberDaysLeftLabel());
    update();
    const timer = window.setInterval(update, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  return label;
}
