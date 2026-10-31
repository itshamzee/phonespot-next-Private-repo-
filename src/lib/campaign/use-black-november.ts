"use client";

import { useEffect, useState } from "react";
import { isBlackNovember } from "./black-november";

/**
 * Om Black November kører, set fra kundens browser. Første render bruger
 * serverens svar (så hydreringen matcher en side, der er bygget før eller
 * efter midnat), og derefter kundens ur — så kampagnen tænder præcis kl. 00:00
 * og slukker igen 1. december, også på sider fra cachen.
 */
export function useBlackNovember(serverActive: boolean): boolean {
  const [active, setActive] = useState(serverActive);
  useEffect(() => {
    const check = () => setActive(isBlackNovember());
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return active;
}
