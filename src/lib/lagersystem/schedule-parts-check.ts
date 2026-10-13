import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "./client";
import { createSupabasePartsCheckRepo } from "./parts-check-repo";
import { checkTicketParts } from "./parts-check-run";
import { notifyPartsShortage } from "./shortage-mail";

/**
 * Spec §4.4: lagertjek efter oprettelse af en reparationssag. Kunden mærker
 * intet — kører efter svaret, kaster aldrig og gør intet uden LAGERSYSTEM_*.
 */
export function scheduleTicketPartsCheck(ticketId: string): void {
  try {
    const client = getLagersystemClient();
    if (!client) return;
    after(async () => {
      try {
        await checkTicketParts(ticketId, { repo: createSupabasePartsCheckRepo(createAdminClient()), client, notify: notifyPartsShortage });
      } catch (err) {
        console.error("[lagertjek] tjek efter oprettelse fejlede", ticketId, err);
      }
    });
  } catch (err) {
    console.error("[lagertjek] kunne ikke planlægge tjek", ticketId, err);
  }
}
