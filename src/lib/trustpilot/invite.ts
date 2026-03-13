/**
 * Trustpilot automatic review invitation.
 *
 * Uses Trustpilot's Service Review Invitation API to send review invitations
 * after order delivery. Called from order status update webhook/handler.
 *
 * Requires env vars:
 * - TRUSTPILOT_BUSINESS_UNIT_ID
 * - TRUSTPILOT_API_KEY
 * - TRUSTPILOT_API_SECRET
 *
 * Docs: https://documentation-apidocumentation.trustpilot.com/
 */

const TRUSTPILOT_API_BASE = "https://invitations-api.trustpilot.com/v1";
const BUSINESS_UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID ?? "";
const API_KEY = process.env.TRUSTPILOT_API_KEY ?? "";
const API_SECRET = process.env.TRUSTPILOT_API_SECRET ?? "";

type TrustpilotInviteInput = {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  locale?: string;
  redirectUri?: string;
};

/**
 * Send a Trustpilot review invitation after order delivery.
 */
export async function sendTrustpilotInvitation(input: TrustpilotInviteInput): Promise<void> {
  if (!BUSINESS_UNIT_ID || !API_KEY || !API_SECRET) {
    console.log("[trustpilot] Skipping — API credentials not configured");
    return;
  }

  // Get access token
  const tokenRes = await fetch("https://api.trustpilot.com/v1/oauth/oauth-business-users-for-applications/accesstoken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok) {
    console.error("[trustpilot] Failed to get access token:", await tokenRes.text());
    return;
  }

  const { access_token } = await tokenRes.json();

  // Send invitation
  const inviteRes = await fetch(
    `${TRUSTPILOT_API_BASE}/private/business-units/${BUSINESS_UNIT_ID}/email-invitations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        consumerEmail: input.customerEmail,
        consumerName: input.customerName,
        referenceNumber: input.orderNumber,
        locale: input.locale ?? "da-DK",
        senderEmail: "hej@phonespot.dk",
        senderName: "PhoneSpot",
        replyTo: "hej@phonespot.dk",
        templateId: "default",
        redirectUri: input.redirectUri ?? "https://phonespot.dk",
        tags: ["order"],
        preferredSendTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days after
      }),
    }
  );

  if (!inviteRes.ok) {
    console.error("[trustpilot] Failed to send invitation:", await inviteRes.text());
    return;
  }

  console.log(`[trustpilot] Review invitation sent for order ${input.orderNumber}`);
}
