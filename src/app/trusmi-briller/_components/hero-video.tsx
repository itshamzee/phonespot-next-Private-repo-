"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  poster: string;
  className?: string;
}

/**
 * Hero video with proper mobile-autoplay handling. Mobile Safari is
 * particularly strict — it requires `muted`, `playsInline`, and the
 * play() call to succeed inside a user-gesture or before the page
 * fully settles. We retry once after the metadata loads as a fallback.
 *
 * If autoplay is permanently blocked (e.g. iOS reduced-motion or low
 * battery), the poster image stays visible with a tap-to-play overlay.
 */
export function HeroVideo({ src, poster, className }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.catch(() => setNeedsTap(true));
      }
    };
    if (v.readyState >= 2) tryPlay();
    else v.addEventListener("loadeddata", tryPlay, { once: true });
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        aria-label="Trusmi AI Oversætterbriller produktvideo"
      />
      {needsTap && (
        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = true;
            v.play().then(() => setNeedsTap(false)).catch(() => {});
          }}
          aria-label="Afspil video"
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity hover:bg-black/40"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-[#0F2A20] shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-9 w-9">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
      {/* Soft vignette to keep overlaid text legible */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
    </div>
  );
}
