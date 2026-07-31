import type {
  ShipmondoShipmentRequest,
  ShipmondoShipmentResponse,
  ShipmondoPickupPoint,
  ShipmondoAddress,
  ShipmondoParcel,
} from "./types";

const BASE_URL = "https://app.shipmondo.com/api/public/v3";

function getHeaders(): HeadersInit {
  const apiUser = process.env.SHIPMONDO_API_USER;
  const apiKey = process.env.SHIPMONDO_API_KEY;
  if (!apiUser || !apiKey) throw new Error("SHIPMONDO_API_USER or SHIPMONDO_API_KEY not configured");
  return {
    Authorization: `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString("base64")}`,
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
    // own_agreement and service_codes are required by the API and were missing
    // from every booking this app made, so each one failed with a 422 before it
    // ever reached the carrier. Defaulted here so no caller can forget them.
    body: JSON.stringify({
      own_agreement: false,
      service_codes: "EMAIL_NT",
      ...request,
    }),
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

export interface ShipmondoWebhook {
  id: number;
  name: string;
  endpoint: string;
  action: string;
  resource_name: string;
  active: boolean;
}

/**
 * Subscribes to carrier progress. `key` is what Shipmondo signs the payload
 * with, so it must match SHIPMONDO_WEBHOOK_KEY on our side.
 */
export async function createWebhook(params: {
  name: string;
  endpoint: string;
  key: string;
  action: "status_update" | "delivered" | "create" | "cancel";
  resource_name: "Shipments" | "Orders" | "Shipment Monitor";
}): Promise<ShipmondoWebhook> {
  return shipmondoFetch<ShipmondoWebhook>("/webhooks", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listWebhooks(): Promise<ShipmondoWebhook[]> {
  return shipmondoFetch<ShipmondoWebhook[]>("/webhooks");
}

export async function getShipmentLabel(shipmentId: number): Promise<string> {
  const res = await fetch(`${BASE_URL}/shipments/${shipmentId}/labels`, {
    headers: {
      ...getHeaders(),
      Accept: "application/pdf",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shipmondo label error ${res.status}: ${body}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export interface ShipmondoProduct {
  id: number;
  code: string;
  name: string;
  available: boolean;
  service_point_available: boolean;
  sender_country_code: string;
  receiver_country_code: string;
  expected_transit_time: string | null;
}

export async function getProducts(
  senderCountry = "DK",
  receiverCountry = "DK",
): Promise<ShipmondoProduct[]> {
  // The parameters are *_country_code. Sending sender_country makes the API
  // reject the call outright with "param is missing".
  const params = new URLSearchParams({
    sender_country_code: senderCountry,
    receiver_country_code: receiverCountry,
  });
  return shipmondoFetch<ShipmondoProduct[]>(`/products?${params}`);
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
