"use client";

import { useEffect, useState } from "react";

const danishTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function getDispatchCountdown(date: Date) {
  const [hour, minute, second] = danishTime.format(date).split(":").map(Number);
  const remaining = 16 * 3600 - (hour * 3600 + minute * 60 + second);
  if (remaining <= 0) return null;
  return [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
}

export function DispatchCountdown({ className }: { className?: string }) {
  const [clock, setClock] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const update = () => setClock(getDispatchCountdown(new Date()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);
  return <div className={className} aria-live="off" title="Gælder varer på eget lager. Vi sender alle ugens dage. Frist kl. 16 dansk tid.">
    {clock === undefined ? "På eget lager · Bestil før kl. 16" : clock === null ? "Varer på eget lager: Vi sender igen i morgen" : <>På eget lager: Afsendes i dag — bestil inden <strong>{clock}</strong></>}
  </div>;
}

