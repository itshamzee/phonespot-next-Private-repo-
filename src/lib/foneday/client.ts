// src/lib/foneday/client.ts
// Foneday API client — Bearer auth, typed responses

import type {
  FonedayProductsResponse,
  FonedaySingleProductResponse,
  FonedayCartArticle,
  FonedayCartResponse,
} from "./types";

const BASE_URL = "https://foneday.shop/api/v1";

function getToken(): string {
  const token = process.env.FONEDAY_API_TOKEN;
  if (!token) throw new Error("FONEDAY_API_TOKEN not configured");
  return token;
}

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

async function fonedayFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Foneday API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** GET /products — Full product catalog */
export async function getProducts(): Promise<FonedayProductsResponse> {
  return fonedayFetch<FonedayProductsResponse>("/products");
}

/** GET /product/{sku} — Single product details */
export async function getProduct(sku: string): Promise<FonedaySingleProductResponse> {
  return fonedayFetch<FonedaySingleProductResponse>(`/product/${encodeURIComponent(sku)}`);
}

/** POST /shopping-cart-add-items — Add items to Foneday cart */
export async function addToCart(articles: FonedayCartArticle[]): Promise<FonedayCartResponse> {
  return fonedayFetch<FonedayCartResponse>("/shopping-cart-add-items", {
    method: "POST",
    body: JSON.stringify({ articles }),
  });
}

// removeFromCart, getOrders, getInvoices — add when needed (out of scope for Phase 1)
