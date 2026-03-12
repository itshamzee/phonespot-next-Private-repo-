import type {
  ShipmondoShipmentRequest,
  ShipmondoShipmentResponse,
  ShipmondoPickupPoint,
  ShipmondoAddress,
  ShipmondoParcel,
} from "./types";

const BASE_URL = "https://app.shipmondo.com/api/public/v3";

function getHeaders(): HeadersInit {
  const apiKey = process.env.SHIPMONDO_API_KEY;
  if (!apiKey) throw new Error("SHIPMONDO_API_KEY not configured");
  return {
    Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
    "Content-Type": "application/json",
  };
}

async function shipmondoFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shipmondo API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function createShipment(
  request: ShipmondoShipmentRequest
): Promise<ShipmondoShipmentResponse> {
  return shipmondoFetch<ShipmondoShipmentResponse>("/shipments", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getPickupPoints(
  carrierCode: string,
  zipcode: string,
  countryCode = "DK",
  limit = 10
): Promise<ShipmondoPickupPoint[]> {
  const params = new URLSearchParams({
    carrier_code: carrierCode,
    zipcode,
    country_code: countryCode,
    per_page: String(limit),
  });
  return shipmondoFetch<ShipmondoPickupPoint[]>(`/pickup_points?${params}`);
}

export async function getShipmentQuotes(
  sender: ShipmondoAddress,
  receiver: ShipmondoAddress,
  parcels: ShipmondoParcel[]
): Promise<ShipmondoShipmentResponse[]> {
  return shipmondoFetch<ShipmondoShipmentResponse[]>("/shipping_quotes", {
    method: "POST",
    body: JSON.stringify({ sender, receiver, parcels }),
  });
}
