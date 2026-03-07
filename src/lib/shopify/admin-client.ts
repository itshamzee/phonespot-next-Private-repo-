const domain = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "";
const API_VERSION = "2024-10";

const adminEndpoint = `https://${domain}/admin/api/${API_VERSION}/graphql.json`;

async function shopifyAdminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(adminEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminAccessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as { data: T; errors?: unknown[] };
  if (json.errors) {
    throw new Error(`Shopify Admin GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

interface DraftOrderLineItem {
  title: string;
  quantity: number;
  originalUnitPrice: string;
}

interface CreateDraftOrderInput {
  customerEmail?: string;
  customerPhone?: string;
  lineItems: DraftOrderLineItem[];
  note?: string;
  tags?: string[];
}

interface DraftOrderResult {
  id: string;
  invoiceUrl: string;
  name: string;
}

export async function createDraftOrder(input: CreateDraftOrderInput): Promise<DraftOrderResult> {
  const mutation = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lineItems: input.lineItems.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        originalUnitPrice: item.originalUnitPrice,
      })),
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      ...(input.customerPhone ? { phone: input.customerPhone } : {}),
      ...(input.note ? { note: input.note } : {}),
      ...(input.tags ? { tags: input.tags } : {}),
    },
  };

  const data = await shopifyAdminFetch<{
    draftOrderCreate: {
      draftOrder: DraftOrderResult | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, variables);

  if (data.draftOrderCreate.userErrors.length > 0) {
    throw new Error(
      `Draft order errors: ${data.draftOrderCreate.userErrors.map((e) => e.message).join(", ")}`,
    );
  }

  if (!data.draftOrderCreate.draftOrder) {
    throw new Error("Draft order creation returned null");
  }

  return data.draftOrderCreate.draftOrder;
}

export async function sendDraftOrderInvoice(draftOrderId: string, email?: string): Promise<void> {
  const mutation = `
    mutation draftOrderInvoiceSend($id: ID!, $email: EmailInput) {
      draftOrderInvoiceSend(id: $id, email: $email) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  await shopifyAdminFetch(mutation, {
    id: draftOrderId,
    ...(email ? { email: { to: email } } : {}),
  });
}
