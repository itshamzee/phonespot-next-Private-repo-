/**
 * Stripe Terminal client-side helper.
 * Manages terminal connection, reader discovery, and payment collection.
 *
 * Usage flow:
 * 1. initTerminal() — connects to Stripe Terminal
 * 2. discoverReaders() — finds nearby readers
 * 3. connectReader(reader) — connects to a specific reader
 * 4. collectPayment(amount, orderId) — creates PaymentIntent + collects on reader
 */

import { loadStripeTerminal, type Terminal, type Reader } from "@stripe/terminal-js";

let terminal: Terminal | null = null;
let connectedReader: Reader | null = null;

/**
 * Initialize the Stripe Terminal SDK.
 * Fetches connection tokens from our API.
 */
export async function initTerminal(): Promise<Terminal> {
  if (terminal) return terminal;

  const StripeTerminal = await loadStripeTerminal();
  if (!StripeTerminal) throw new Error("Failed to load Stripe Terminal SDK");

  terminal = StripeTerminal.create({
    onFetchConnectionToken: async () => {
      const res = await fetch("/api/pos/terminal/connection-token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to fetch connection token");
      const { secret } = await res.json();
      return secret;
    },
    onUnexpectedReaderDisconnect: () => {
      console.warn("[terminal] Reader unexpectedly disconnected");
      connectedReader = null;
    },
  });

  return terminal;
}

/**
 * Discover available readers (internet-connected).
 */
export async function discoverReaders(): Promise<Reader[]> {
  const t = await initTerminal();
  const result = await t.discoverReaders({ simulated: false });

  if ("error" in result) {
    throw new Error(result.error.message);
  }

  return result.discoveredReaders;
}

/**
 * Discover simulated reader (for testing without hardware).
 */
export async function discoverSimulatedReaders(): Promise<Reader[]> {
  const t = await initTerminal();
  const result = await t.discoverReaders({ simulated: true });

  if ("error" in result) {
    throw new Error(result.error.message);
  }

  return result.discoveredReaders;
}

/**
 * Connect to a specific reader.
 */
export async function connectReader(reader: Reader): Promise<Reader> {
  const t = await initTerminal();
  const result = await t.connectReader(reader);

  if ("error" in result) {
    throw new Error(result.error.message);
  }

  connectedReader = result.reader;
  return result.reader;
}

/**
 * Get the currently connected reader, if any.
 */
export function getConnectedReader(): Reader | null {
  return connectedReader;
}

/**
 * Disconnect from the current reader.
 */
export async function disconnectReader(): Promise<void> {
  if (!terminal) return;
  await terminal.disconnectReader();
  connectedReader = null;
}

/**
 * Collect a card payment on the connected reader.
 * Creates a PaymentIntent server-side, then collects payment on the terminal.
 *
 * @param amountOre - Amount in øre (DKK cents)
 * @param orderId - Order ID for metadata
 * @returns PaymentIntent ID on success
 */
export async function collectPayment(
  amountOre: number,
  orderId: string,
): Promise<{ paymentIntentId: string }> {
  const t = await initTerminal();

  if (!connectedReader) {
    throw new Error("No reader connected. Call connectReader() first.");
  }

  // 1. Create PaymentIntent server-side
  const res = await fetch("/api/pos/terminal/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountOre, orderId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create payment intent");
  }

  const { clientSecret, paymentIntentId } = await res.json();

  // 2. Collect and process payment on reader
  const collectResult = await t.collectPaymentMethod(clientSecret);

  if ("error" in collectResult) {
    throw new Error(collectResult.error.message);
  }

  // 3. Process the payment
  const processResult = await t.processPayment(collectResult.paymentIntent);

  if ("error" in processResult) {
    throw new Error(processResult.error.message);
  }

  const intent = processResult.paymentIntent;

  if (intent && intent.status !== "succeeded" && intent.status !== "requires_capture") {
    throw new Error(`Payment not completed. Status: ${intent.status}`);
  }

  return { paymentIntentId };
}

/**
 * Cancel any in-progress payment collection.
 */
export async function cancelCollect(): Promise<void> {
  if (!terminal) return;
  await terminal.cancelCollectPaymentMethod();
}
