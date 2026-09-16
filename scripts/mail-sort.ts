/**
 * Ryd op i one.com-postkasserne: opret mappestrukturen og flyt de seneste 90
 * dages mail i INBOX efter reglerne i src/lib/mail-agent/folders.ts.
 * Kundemails (dem reglerne ikke kender) bliver i INBOX.
 *
 *   npx tsx --env-file=.env.local scripts/mail-sort.ts            # toerkoersel: viser hvad der ville ske
 *   npx tsx --env-file=.env.local scripts/mail-sort.ts --apply    # opret mapper og flyt
 *   npx tsx --env-file=.env.local scripts/mail-sort.ts --analyze <sti-til-json>  # gem 90 dages statistik
 *
 * Sletter aldrig noget. Markerer intet som laest.
 */
import { simpleParser } from "mailparser";
import { loadMailboxes } from "../src/lib/mail-agent/config";
import { FOLDERS, folderByRules, folderPath, type FolderKey } from "../src/lib/mail-agent/folders";
import { ensureFolder, withImap } from "../src/lib/mail-agent/imap";

const apply = process.argv.includes("--apply");
const analyzeIdx = process.argv.indexOf("--analyze");
const analyzePath = analyzeIdx >= 0 ? process.argv[analyzeIdx + 1] : null;
const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);

interface Row {
  mailbox: string;
  uid: number;
  date: string;
  from: string;
  fromName: string;
  subject: string;
  listUnsubscribe: boolean;
  seen: boolean;
  answered: boolean;
  folder: FolderKey | null;
}

async function main() {
  const boxes = loadMailboxes();
  if (!boxes.length) {
    console.error("Ingen postkasser konfigureret (MAIL_AGENT_MAILBOXES + ONECOM_MAIL_PASSWORD_*).");
    process.exit(1);
  }
  const all: Row[] = [];

  for (const box of boxes) {
    console.log(`\n=== ${box.address}`);
    try {
    await withImap(box, async (client) => {
      if (apply) {
        for (const key of Object.keys(FOLDERS) as FolderKey[]) {
          const path = await ensureFolder(client, folderPath(key));
          console.log(`  mappe ok: ${path}`);
        }
      }

      const lock = await client.getMailboxLock("INBOX");
      const moves = new Map<FolderKey, number[]>();
      try {
        const uids = (await client.search({ since }, { uid: true })) as number[] | false;
        if (!uids || !uids.length) {
          console.log("  ingen mails i perioden");
          return;
        }
        for await (const msg of client.fetch(uids, { uid: true, envelope: true, flags: true, headers: ["list-unsubscribe"] }, { uid: true })) {
          const env = msg.envelope;
          const from = env?.from?.[0];
          const headers = msg.headers ? (await simpleParser(msg.headers)).headers : null;
          const row: Row = {
            mailbox: box.address,
            uid: msg.uid,
            date: (env?.date ?? new Date()).toISOString(),
            from: (from?.address ?? "").toLowerCase(),
            fromName: from?.name ?? "",
            subject: env?.subject ?? "",
            listUnsubscribe: Boolean(headers?.get("list-unsubscribe")),
            seen: msg.flags?.has("\\Seen") ?? false,
            answered: msg.flags?.has("\\Answered") ?? false,
            folder: null,
          };
          row.folder = folderByRules({ fromEmail: row.from, subject: row.subject, listUnsubscribe: row.listUnsubscribe });
          all.push(row);
          if (row.folder) moves.set(row.folder, [...(moves.get(row.folder) ?? []), row.uid]);
        }
      } finally {
        lock.release();
      }

      const total = all.filter((r) => r.mailbox === box.address).length;
      const stay = all.filter((r) => r.mailbox === box.address && !r.folder).length;
      console.log(`  ${total} mails siden ${since.toISOString().slice(0, 10)}, ${total - stay} flyttes, ${stay} bliver i INBOX (kunder)`);
      for (const [key, uids] of moves) {
        console.log(`  ${apply ? "flytter" : "ville flytte"} ${uids.length} -> ${folderPath(key).join("/")}`);
        if (apply) {
          const target = await ensureFolder(client, folderPath(key));
          const lock2 = await client.getMailboxLock("INBOX");
          try {
            await client.messageMove(uids, target, { uid: true });
          } finally {
            lock2.release();
          }
        }
      }
    });
    } catch (err) {
      console.error(`  FEJL paa ${box.address}: ${(err as Error).message} (springer over, proev igen senere)`);
    }
  }

  if (analyzePath) {
    const fs = await import("node:fs");
    fs.writeFileSync(analyzePath, JSON.stringify(all, null, 1));
    console.log(`\nStatistik gemt: ${analyzePath} (${all.length} mails)`);
  }
  console.log(apply ? "\nFaerdig." : "\nToerkoersel faerdig. Koer med --apply for at flytte.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
