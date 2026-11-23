"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type CardHoverImageProps = {
  src: string;
  sizes?: string;
  /** Classes for the image itself, normally the same as the card's first image. */
  className?: string;
  /** Render a plain <img> for hosts that next/image is not configured for. */
  plain?: boolean;
};

/**
 * Second product photo shown while a mouse rests on the card.
 *
 * Nothing is fetched until the first mouse/pen `pointerenter` on the card
 * (touch never arms it), so the photo is not in the server HTML, never
 * preloaded and never downloaded on phones. It is decorative: the first
 * image keeps the real alt text. Fades in via CSS (.card-hover-img) only
 * once it has loaded, so the hover never shows a blank frame.
 */
export function CardHoverImage({ src, sizes, className, plain = false }: CardHoverImageProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [armed, setArmed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (armed) return;
    const host = ref.current;
    const card = host?.closest("a, article") ?? host?.parentElement;
    if (!card) return;
    const arm = (event: Event) => {
      if ((event as PointerEvent).pointerType === "touch") return;
      setArmed(true);
    };
    card.addEventListener("pointerenter", arm);
    return () => card.removeEventListener("pointerenter", arm);
  }, [armed]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-hover-image=""
      data-loaded={loaded ? "" : undefined}
      className="card-hover-img pointer-events-none absolute inset-0 block"
    >
      {armed &&
        (plain ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className={className}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <Image
            src={src}
            alt=""
            fill
            loading="lazy"
            sizes={sizes}
            className={className}
            onLoad={() => setLoaded(true)}
          />
        ))}
    </span>
  );
}
