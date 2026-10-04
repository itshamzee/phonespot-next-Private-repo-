"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vises når serveren ikke kunne se en session (fx lige efter login i den klientside
 * ramme): henter siden igen én gang, så den nu logger ind med cookien.
 */
export function RefreshOnMount() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return <p className="m-0 text-[14px] text-[#5E6A63]">Indlæser</p>;
}
