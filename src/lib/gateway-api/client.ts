const GATEWAY_API_TOKEN = process.env.GATEWAYAPI_TOKEN ?? "";
const GATEWAY_API_URL = "https://gatewayapi.com/rest/mtsms";
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
  const normalized = phone.replace(/\s+/g, "").replace(/^(\+45)?/, "45");

  try {
    const res = await fetch(GATEWAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_API_TOKEN}`,
      },
      body: JSON.stringify({
        sender: SENDER_NAME,
        message,
        recipients: [{ msisdn: Number(normalized) }],
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
