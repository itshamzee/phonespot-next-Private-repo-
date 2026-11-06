import { after } from "next/server";
import { getLagersystemClient } from "./client";
import { sendRepairPart } from "./outbox";
import type { RepairPartRow, RepairPartsRepo } from "./types";

/** Spec §4.2: send straks efter svaret; fejl samles op af cron-ruten. */
export function scheduleSend(row: RepairPartRow, repo: RepairPartsRepo): void {
  if (row.status !== "pending") return;
  const client = getLagersystemClient();
  if (!client) return;
  after(async () => {
    try {
      await sendRepairPart(row, { repo, client, now: new Date() });
    } catch (err) {
      console.error("[lagersystem] afsendelse fejlede", row.id, err);
    }
  });
}
