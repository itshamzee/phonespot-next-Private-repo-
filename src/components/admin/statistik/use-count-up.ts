"use client";

import { useEffect, useRef, useState } from "react";

function reducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tæller op fra det viste tal til `value` på `duration` ms (ease-out); første
 * gang fra 0. Serveren og første render viser den rigtige værdi, så tallet
 * findes uden JavaScript. Under prefers-reduced-motion springer tallet direkte.
 */
export function useCountUp(value: number, duration = 450): number {
  const [shown, setShown] = useState(value);
  const current = useRef(0);

  useEffect(() => {
    const start = current.current;
    const animate = start !== value && !reducedMotion();
    const t0 = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const p = animate ? Math.min(1, Math.max(0, (t - t0) / duration)) : 1;
      const next = p >= 1 ? value : start + (value - start) * (1 - Math.pow(1 - p, 3));
      current.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return shown;
}
