import { STORES } from "@/lib/store-config";

/**
 * A one.com mailbox the agent polls and replies from. Passwords come from env,
 * one variable per mailbox, named after the local part: ONECOM_MAIL_PASSWORD_INFO.
 */
export interface MailboxConfig {
  address: string;
  localPart: string;
  password: string;
  displayName: string;
  storeId: "slagelse" | "vejle" | null;
}

export const ONECOM = {
  imapHost: "imap.one.com",
  imapPort: 993,
  smtpHost: "send.one.com",
  smtpPort: 587,
} as const;

export function passwordEnvName(address: string): string {
  const local = address.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `ONECOM_MAIL_PASSWORD_${local}`;
}

export function storeIdFor(address: string): "slagelse" | "vejle" | null {
  const lower = address.toLowerCase();
  for (const store of Object.values(STORES)) {
    if (store.email.toLowerCase() === lower) return store.slug as "slagelse" | "vejle";
  }
  return null;
}

/** "PhoneSpot Slagelse" for a store mailbox, plain "PhoneSpot" for the rest. */
export function displayNameFor(address: string): string {
  const storeId = storeIdFor(address);
  return storeId ? STORES[storeId].name : "PhoneSpot";
}

/**
 * Mailboxes from MAIL_AGENT_MAILBOXES that also have a password set. A mailbox
 * without a password is skipped with a warning so the agent still runs on the
 * ones that are configured.
 */
export function loadMailboxes(env: NodeJS.ProcessEnv = process.env): MailboxConfig[] {
  const raw = env.MAIL_AGENT_MAILBOXES ?? "";
  const addresses = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const boxes: MailboxConfig[] = [];
  for (const address of addresses) {
    const password = env[passwordEnvName(address)];
    if (!password) {
      console.warn(`[mail-agent] ${address} springes over: ${passwordEnvName(address)} er ikke sat`);
      continue;
    }
    boxes.push({
      address,
      localPart: address.split("@")[0],
      password,
      displayName: displayNameFor(address),
      storeId: storeIdFor(address),
    });
  }
  return boxes;
}
