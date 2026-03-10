const adminDomain = process.env.SHOPIFY_ADMIN_DOMAIN ?? "";
const adminAccessToken = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const API_VERSION = "2024-10";

// Admin API requires the .myshopify.com domain, not the custom domain
const adminEndpoint = `https://${adminDomain}/admin/api/${API_VERSION}/graphql.json`;

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

// ---- Product creation -------------------------------------------------------

interface CreateProductInput {
  title: string;
  bodyHtml?: string;
  productType: string;
  tags: string[];
  price: string;
  imageUrls?: string[];
}

interface CreateProductResult {
  id: string;
  handle: string;
  title: string;
}

export async function createProduct(input: CreateProductInput): Promise<CreateProductResult> {
  // Use productSet which supports product + variants in a single mutation (API 2024-10+)
  const mutation = `
    mutation productSet($productSet: ProductSetInput!, $synchronous: Boolean!) {
      productSet(input: $productSet, synchronous: $synchronous) {
        product {
          id
          handle
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const productSet: Record<string, unknown> = {
    title: input.title,
    descriptionHtml: input.bodyHtml ?? "",
    vendor: "PhoneSpot",
    productType: input.productType,
    tags: input.tags,
    status: "ACTIVE",
    productOptions: [
      { name: "Title", values: [{ name: "Default Title" }] },
    ],
    variants: [
      {
        price: input.price,
        optionValues: [{ optionName: "Title", name: "Default Title" }],
      },
    ],
  };

  if (input.imageUrls && input.imageUrls.length > 0) {
    productSet.files = input.imageUrls.map((url, i) => ({
      originalSource: url,
      contentType: "IMAGE",
      alt: i === 0 ? input.title : `${input.title} - ${i + 1}`,
    }));
  }

  const data = await shopifyAdminFetch<{
    productSet: {
      product: CreateProductResult | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, { productSet, synchronous: true });

  if (data.productSet.userErrors.length > 0) {
    throw new Error(
      `Product create errors: ${data.productSet.userErrors.map((e) => e.message).join(", ")}`,
    );
  }

  if (!data.productSet.product) {
    throw new Error("Product creation returned null");
  }

  return data.productSet.product;
}

export async function getCollectionByHandle(handle: string): Promise<string | null> {
  const query = `
    query getCollection($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
      }
    }
  `;

  const data = await shopifyAdminFetch<{
    collectionByHandle: { id: string } | null;
  }>(query, { handle });

  return data.collectionByHandle?.id ?? null;
}

export async function addProductToCollection(collectionId: string, productId: string): Promise<void> {
  const mutation = `
    mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdminFetch<{
    collectionAddProducts: {
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, { id: collectionId, productIds: [productId] });

  if (data.collectionAddProducts.userErrors.length > 0) {
    throw new Error(
      `Collection add errors: ${data.collectionAddProducts.userErrors.map((e) => e.message).join(", ")}`,
    );
  }
}

// ---- Draft orders -----------------------------------------------------------

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
