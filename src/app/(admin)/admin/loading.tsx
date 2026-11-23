import { PageSkeleton } from "@/components/admin/ui/skeleton";

/**
 * Mens en admin-side hentes: et neutralt skelet i rammens indholdsfelt, så siden
 * ikke står tom og indholdet ikke hopper. Statistik har sit eget (statistik/loading.tsx).
 *
 * Med en loading-grænse på dette niveau bliver redirect() og notFound() i admin-sider
 * streamet: en hård indlæsning svarer 200 og omdirigerer i browseren. Det er i orden
 * for det indloggede admin, som ikke indekseres.
 */
export default function AdminLoading() {
  return <PageSkeleton />;
}
