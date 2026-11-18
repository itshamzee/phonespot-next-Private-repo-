import { PageSkeleton } from "@/components/admin/ui/skeleton";

/**
 * Mens en admin-side hentes: et neutralt skelet i rammens indholdsfelt, så siden
 * ikke står tom og indholdet ikke hopper. Statistik har sit eget (statistik/loading.tsx).
 */
export default function AdminLoading() {
  return <PageSkeleton />;
}
