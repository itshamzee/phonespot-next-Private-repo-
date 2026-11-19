"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

// Loft over varighed og forsinkelse, så ingen sektion venter eller trækker ud.
const MAX_DURATION = 0.3;
const MAX_DELAY = 0.12;

/**
 * Lille glid op, når en sektion rulles ind i billedet.
 *
 * Indholdet er altid synligt: der animeres kun translate (8 px), aldrig
 * opacity, så tekst kan læses af alle (også Google) uden JavaScript og uden
 * at blive rullet frem. Det, der allerede er i billedet, når siden vises,
 * står stille (ingen hop efter hydrering), og ved reduced motion sker intet.
 */
export function FadeIn({ children, delay = 0, duration = 0.3, className }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  // "idle": ingen effekt. "waiting": under folden, venter på at blive set.
  // "shown": glider på plads.
  const [phase, setPhase] = useState<"idle" | "waiting" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Allerede (delvist) synlig ved montering: lad den stå.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setPhase("waiting");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const d = Math.min(duration, MAX_DURATION);
  const wait = Math.min(delay, MAX_DELAY);

  return (
    <div
      ref={ref}
      className={className}
      data-fade={phase}
      style={
        phase === "idle"
          ? undefined
          : {
              translate: phase === "waiting" ? "0 8px" : "none",
              transition:
                phase === "shown"
                  ? `translate ${d}s cubic-bezier(0.23, 1, 0.32, 1) ${wait}s`
                  : "none",
            }
      }
    >
      {children}
    </div>
  );
}
