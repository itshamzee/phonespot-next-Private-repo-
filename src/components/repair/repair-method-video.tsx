"use client";

import { useState } from "react";
import styles from "./repair-landing.module.css";

export function RepairMethodVideo() {
  const [playing, setPlaying] = useState(false);
  return <div className={styles.video}>
    {playing ? <video controls autoPlay playsInline preload="none" poster="/images/repair/reparation-poster.png" aria-label="Sådan foregår en reparation hos PhoneSpot">
      <source src="/videos/reparation.mp4" type="video/mp4" />
      <a href="/videos/reparation.mp4">Se filmen om dit reparationsforløb</a>
    </video> : <button type="button" onClick={() => setPlaying(true)} aria-label="Afspil: Dit reparationsforløb. 28 sekunder uden lyd.">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/repair/reparation-poster.png" alt="" width={960} height={540} loading="lazy" />
      <span className={styles.play}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor" /></svg>Se dit reparationsforløb <small>28 sek. · Uden lyd</small></span>
    </button>}
  </div>;
}
