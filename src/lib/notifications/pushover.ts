// Pushover push notification service
// Sends mobile notifications with custom sounds (e.g., "cashregister" for new orders)
// Setup: https://pushover.net — $5 one-time purchase for iOS/Android app

const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json";

interface PushoverMessage {
  title: string;
  message: string;
  sound?: string; // "cashregister", "bugle", "cosmic", etc.
  priority?: -2 | -1 | 0 | 1 | 2; // -2 silent, 0 normal, 1 high, 2 emergency
  url?: string;
  url_title?: string;
}

/**
 * Send a push notification via Pushover.
 * Requires PUSHOVER_USER_KEY and PUSHOVER_API_TOKEN env vars.
 * Non-fatal: logs errors but never throws.
 */
export async function sendPushover(msg: PushoverMessage): Promise<boolean> {
  const userKey = process.env.PUSHOVER_USER_KEY;
  const apiToken = process.env.PUSHOVER_API_TOKEN;

  if (!userKey || !apiToken) {
    console.warn("[pushover] PUSHOVER_USER_KEY or PUSHOVER_API_TOKEN not set, skipping");
    return false;
  }

  try {
    const res = await fetch(PUSHOVER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: apiToken,
        user: userKey,
        title: msg.title,
        message: msg.message,
        sound: msg.sound || "cashregister",
        priority: msg.priority ?? 0,
        url: msg.url,
        url_title: msg.url_title,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[pushover] send failed:", res.status, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[pushover] send error:", err);
    return false;
  }
}

/**
 * Send a new order notification with cashregister sound.
 */
export async function notifyNewOrder(params: {
  orderNumber: string;
  customerName: string;
  totalKr: string;
  itemCount: number;
  adminUrl?: string;
}): Promise<void> {
  await sendPushover({
    title: `💰 Ny ordre! ${params.orderNumber}`,
    message: `${params.customerName} — ${params.totalKr}\n${params.itemCount} ${params.itemCount === 1 ? "vare" : "varer"}`,
    sound: "cashregister",
    priority: 1, // high priority — bypasses Do Not Disturb
    url: params.adminUrl || "https://phonespot.dk/admin/platform/orders",
    url_title: "Se ordre",
  });
}
