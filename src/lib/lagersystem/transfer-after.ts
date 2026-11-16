import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Transfer } from "./api-types";
import { notifyNewTransferOnce } from "./ticket-transfers";
import { createSupabaseTicketTransfersRepo } from "./ticket-transfers-repo";
import { sendTransferRequestMail } from "./transfer-mail";

/** Mail til afsenderen efter svaret; cron (pollRequestedTransfers) samler op, hvis det fejler. */
export function scheduleTransferMail(transfer: Transfer): void {
  try {
    after(async () => {
      try {
        await notifyNewTransferOnce(transfer, { links: createSupabaseTicketTransfersRepo(createAdminClient()), send: sendTransferRequestMail });
      } catch (err) {
        console.error("[flytninger] mail efter oprettelse fejlede", transfer.id, err);
      }
    });
  } catch (err) {
    console.error("[flytninger] kunne ikke planlægge mail", transfer.id, err);
  }
}
