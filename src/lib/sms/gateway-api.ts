// GatewayAPI.com SMS client for Denmark
// Docs: https://gatewayapi.com/docs/rest.html

const GATEWAY_API_TOKEN = process.env.GATEWAYAPI_TOKEN;
const SENDER_NAME = "PhoneSpot";

interface SendSmsOptions {
  to: string;     // Danish phone number, e.g. "4512345678"
  message: string;
}

interface GatewayApiResponse {
  ids: number[];
}

export async function sendSms({ to, message }: SendSmsOptions): Promise<{ success: boolean; messageId?: number }> {
  if (!GATEWAY_API_TOKEN) {
    console.warn("[SMS] GATEWAYAPI_TOKEN not set — skipping SMS");
    return { success: false };
  }

  // Ensure phone number has country code
  const recipient = to.startsWith("+") ? to.replace("+", "") : to.startsWith("45") ? to : `45${to}`;

  const res = await fetch("https://gatewayapi.com/rest/mtsms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_API_TOKEN}`,
    },
    body: JSON.stringify({
      sender: SENDER_NAME,
      message,
      recipients: [{ msisdn: parseInt(recipient, 10) }],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("[SMS] GatewayAPI error:", error);
    return { success: false };
  }

  const data: GatewayApiResponse = await res.json();
  return { success: true, messageId: data.ids?.[0] };
}
