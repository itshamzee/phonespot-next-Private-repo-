import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "./client";
import { createSupabasePartsCheckRepo } from "./parts-check-repo";
import { sendRepairPart } from "./outbox";
import { checkTicketParts } from "./parts-check-run";
import { notifyPartsShortage } from "./shortage-mail";
import type { RepairPartRow, RepairPartsRepo } from "./types";

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

/**
 * Efter en reklamation: send først de nye lagerbevægelser (RETURN + evt. genudtag) og kør så
 * lagertjekket, så saldoen er rigtig. Ét after()-kald, så rækkefølgen er sikker. Kaster aldrig.
 */
export function scheduleSendsThenPartsCheck(ticketId: string, rows: RepairPartRow[], repo: RepairPartsRepo): void {
  try {
    const client = getLagersystemClient();
    if (!client) return;
    after(async () => {
      for (const row of rows) {
        try {
          await sendRepairPart(row, { repo, client, now: new Date() });
        } catch (err) {
          console.error("[lagersystem] afsendelse fejlede", row.id, err);
        }
      }
      try {
        await checkTicketParts(ticketId, { repo: createSupabasePartsCheckRepo(createAdminClient()), client, notify: notifyPartsShortage });
      } catch (err) {
        console.error("[lagertjek] tjek efter reklamation fejlede", ticketId, err);
      }
    });
  } catch (err) {
    console.error("[lagertjek] kunne ikke planlægge tjek efter reklamation", ticketId, err);
  }
}
