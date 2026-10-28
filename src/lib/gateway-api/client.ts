// GatewayAPI kræver "Token <token>" (Bearer afvises). trim(): env-værdien har haft et afsluttende linjeskift.
import { deliveryCallbackUrl, normalizeMsisdn } from "./delivery";

const GATEWAY_API_TOKEN = (process.env.GATEWAYAPI_TOKEN ?? "").trim();
// Kontoen ligger på EU-platformen; tokens fra gatewayapi.eu afvises af gatewayapi.com.
const GATEWAY_API_URL = "https://gatewayapi.eu/rest/mtsms";
const SENDER_NAME = "PhoneSpot";

interface SendSmsResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

export async function sendSms(
  phone: string,
  message: string,
): Promise<SendSmsResult> {
  const normalized = normalizeMsisdn(phone);

  try {
    const res = await fetch(GATEWAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${GATEWAY_API_TOKEN}`,
      },
      body: JSON.stringify({
        sender: SENDER_NAME,
        message,
        recipients: [{ msisdn: Number(normalized) }],
        // Leveringsrapport til sms_log (DELIVERED/UNDELIVERABLE …).
        callback_url: deliveryCallbackUrl(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, messageId: null, error: err };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: String(data.ids?.[0] ?? ""),
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      messageId: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
