"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * CSS-based fade-in on scroll. SSR-safe: renders visible by default,
 * then sets up intersection observer on mount.
 */
export function FadeIn({ children, delay = 0, duration = 0.5, className }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Before mount (SSR), render fully visible — no flash of invisible content
  const isVisible = !mounted || hasAnimated;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : "translateY(10px)",
        transition: mounted
          ? `opacity ${duration}s ease ${delay}s, transform ${duration}s ease ${delay}s`
          : "none",
      }}
    >
      {children}
    </div>
  );
}
