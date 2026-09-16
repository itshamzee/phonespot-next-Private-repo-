/**
 * Toerkoersel af mailassistenten: henter ulaest mail fra one.com-postkasserne,
 * lader Claude vurdere dem og printer resultatet. Markerer INTET som laest og
 * skriver INTET i databasen (ud over laesninger til opslag).
 *
 *   npx tsx --env-file=.env.local scripts/mail-agent-dry-run.ts [antal]
 */
import { runMailAgent } from "../src/lib/mail-agent/run";

const max = Number(process.argv[2] ?? 5);

runMailAgent({ dryRun: true, maxMails: max })
  .then((r) => {
    console.log("\nRapport:", JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
