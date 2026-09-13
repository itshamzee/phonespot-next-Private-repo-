"use client";

import { useState } from "react";
import styles from "./sell-device.module.css";

export function SellMethodVideo() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={styles.methodVideo}>
      {playing ? (
        <video controls autoPlay playsInline preload="none" aria-label="Sådan sælger du din enhed til PhoneSpot" poster="/images/buyback/saelg-video-poster.png">
          <source src="/videos/saelg-din-enhed.mp4" type="video/mp4" />
          <a href="/videos/saelg-din-enhed.mp4">Se filmen om at sælge din enhed</a>
        </video>
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label="Afspil: Sådan sælger du din enhed. 28 sekunder uden lyd.">
          {/* Native image keeps the small poster independent of the video download. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/buyback/saelg-video-poster.png" alt="" width="960" height="540" loading="lazy" />
          <span className={styles.playVideo}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor" /></svg>Se de fire trin <small>28 sek. · Uden lyd</small></span>
        </button>
      )}
    </div>
  );
}
