import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Indleveringsfotos er persondata (kundens enhed, skærmindhold, IMEI) og ligger
 * i den PRIVATE bucket `repair-photos`. Databasen gemmer kun stien
 * ("intake/123-abc.jpg"); personalet får en kortlevet signeret URL, når en side
 * eller PDF skal vise billedet.
 *
 * Ældre rækker kan indeholde en fuld offentlig URL (fra `device-photos`, før
 * flytningen — se scripts/migrate-repair-photos-private.mjs). De returneres
 * uændret, indtil scriptet har kørt.
 */

export const REPAIR_PHOTO_BUCKET = "repair-photos";
export const REPAIR_PHOTO_FOLDERS = ["intake", "checklist", "checkout"] as const;
export type RepairPhotoFolder = (typeof REPAIR_PHOTO_FOLDERS)[number];

/** Levetid for signerede URL'er: lang nok til at en side kan vises og en PDF rendres. */
export const REPAIR_PHOTO_URL_SECONDS = 600;

export function isRepairPhotoFolder(v: unknown): v is RepairPhotoFolder {
  return typeof v === "string" && (REPAIR_PHOTO_FOLDERS as readonly string[]).includes(v);
}

const URL_IN_BUCKET = new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${REPAIR_PHOTO_BUCKET}/([^?#]+)`);

/**
 * Sti i `repair-photos` for en gemt værdi, eller null hvis værdien ikke peger
 * dertil (tom, ekstern eller en gammel offentlig URL fra en anden bucket).
 */
export function repairPhotoPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    const m = URL_IN_BUCKET.exec(v);
    return m ? decodeURIComponent(m[1]) : null;
  }
  const folder = v.split("/")[0];
  return isRepairPhotoFolder(folder) ? v : null;
}

/** Signerer en liste af gemte værdier. Svaret er parallelt med input; ukendte/fejlede værdier returneres uændret. */
export async function signRepairPhotoValues(
  client: SupabaseClient,
  values: (string | null | undefined)[],
  seconds = REPAIR_PHOTO_URL_SECONDS,
): Promise<(string | null)[]> {
  const paths = Array.from(new Set(values.map(repairPhotoPath).filter((p): p is string => Boolean(p))));
  const signed = new Map<string, string>();

  if (paths.length > 0) {
    const { data, error } = await client.storage.from(REPAIR_PHOTO_BUCKET).createSignedUrls(paths, seconds);
    if (error) {
      console.error("[repair-photos] signing failed:", error.message);
    } else {
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
      }
    }
  }

  return values.map((value) => {
    const path = repairPhotoPath(value);
    if (path && signed.has(path)) return signed.get(path)!;
    // Kunne ikke signeres: aldrig en offentlig URL for en privat sti — giv hellere null.
    if (path) return null;
    return value ?? null;
  });
}

type PhotoTicket = {
  intake_photos?: string[] | null;
  checkout_photos?: string[] | null;
  intake_checklist?: { photo_url?: string | null }[] | null;
};

/** Returnerer sagen med signerede URL'er i intake_photos, checkout_photos og tjeklistens photo_url. */
export async function withSignedRepairPhotos<T extends PhotoTicket>(client: SupabaseClient, ticket: T): Promise<T> {
  const intake = ticket.intake_photos ?? [];
  const checkout = ticket.checkout_photos ?? [];
  const checklist = ticket.intake_checklist ?? [];

  const flat = [...intake, ...checkout, ...checklist.map((c) => c?.photo_url ?? null)];
  if (flat.every((v) => !v)) return ticket;
  const signed = await signRepairPhotoValues(client, flat);

  let i = 0;
  const take = () => signed[i++];
  const intakeSigned = intake.map(() => take()).filter((v): v is string => Boolean(v));
  const checkoutSigned = checkout.map(() => take()).filter((v): v is string => Boolean(v));
  const checklistSigned = checklist.map((item) => ({ ...item, photo_url: take() }));

  return {
    ...ticket,
    intake_photos: intakeSigned,
    checkout_photos: checkoutSigned,
    intake_checklist: checklistSigned,
  };
}
