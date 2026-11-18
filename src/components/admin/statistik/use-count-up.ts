"use client";

import { useEffect, useRef, useState } from "react";

function reducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tæller fra det viste tal til `value` på `duration` ms (ease-out), når værdien
 * skifter efter første visning. Første visning (også serverens HTML) står med
 * den rigtige værdi uden animation. Under prefers-reduced-motion springer tallet.
 */
export function useCountUp(value: number, duration = 450): number {
  const [shown, setShown] = useState(value);
  // Det tal, der står på skærmen lige nu; startpunkt for næste animation.
  const current = useRef(value);

  useEffect(() => {
    const start = current.current;
    if (start === value) return;
    const animate = !reducedMotion();
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
