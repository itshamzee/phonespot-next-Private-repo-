"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/admin/ui/skeleton";

/**
 * Vises når serveren ikke kunne se en session (fx lige efter login i den klientside
 * ramme): henter siden igen én gang, så den nu logger ind med cookien. Imens står
 * det fælles sideskelet, så siden ikke er tom.
 */
export function RefreshOnMount() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return <PageSkeleton />;
}
