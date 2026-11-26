"use client";

import { useEffect, useState } from "react";
import { isBlackWeek } from "./black-week";

/**
 * Om Black Week kører, set fra kundens browser. Første render bruger
 * serverens svar (så hydreringen matcher sider fra cachen), derefter kundens
 * ur — så kampagnen slukker præcis 1. december kl. 00:00.
 */
export function useBlackWeek(serverActive: boolean): boolean {
  const [active, setActive] = useState(serverActive);
  useEffect(() => {
    const check = () => setActive(isBlackWeek());
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return active;
}
