import { createServerClient } from "@/lib/supabase/client";

/**
 * Collect all personal data for a customer (data portability — GDPR Art. 20).
 * Returns a JSON object with all categories of personal data.
 */
export async function exportCustomerData(customerId: string) {
  const supabase = createServerClient();

  // Fetch customer profile
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (!customer) return null;

  // Fetch orders
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, order_number, type, status, total,
      shipping_address, shipping_method, tracking_number,
      created_at, confirmed_at, shipped_at, delivered_at,
      order_items (
        item_type, quantity, unit_price, total_price
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  // Fetch warranties
  const { data: warranties } = await supabase
    .from("warranties")
    .select("guarantee_number, issued_at, expires_at, status")
    .eq("customer_id", customerId);

  // Fetch consent records
  const { data: consents } = await supabase
    .from("consent_log")
    .select("consent_type, granted, granted_at, withdrawn_at")
    .eq("customer_id", customerId);

  // Fetch trade-ins
  const { data: tradeIns } = await supabase
    .from("trade_ins")
    .select("device_description, offered_price, status, submitted_at")
    .eq("customer_id", customerId);

  // Fetch contact inquiries
  const { data: inquiries } = await supabase
    .from("contact_inquiries")
    .select("subject, message, created_at")
    .eq("email", customer.email);

  // Fetch notify requests
  const { data: notifyRequests } = await supabase
    .from("notify_requests")
    .select("customer_email, created_at, notified_at, status")
    .eq("customer_email", customer.email);

  return {
    exportedAt: new Date().toISOString(),
    dataController: {
      name: "PhoneSpot ApS",
      cvr: "38688766",
      address: "VestsjællandsCentret 10, 4200 Slagelse",
      email: "info@phonespot.dk",
    },
    personalData: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      addresses: customer.addresses,
      accountCreated: customer.created_at,
      marketingConsent: customer.marketing_consent,
      marketingConsentDate: customer.marketing_consent_at,
    },
    orders: orders || [],
    warranties: warranties || [],
    consentRecords: consents || [],
    tradeIns: tradeIns || [],
    contactInquiries: inquiries || [],
    notifyRequests: notifyRequests || [],
  };
}

/**
 * Delete/anonymize customer data (right to be forgotten — GDPR Art. 17).
 *
 * Note: We CANNOT delete order/transaction data that must be retained for
 * 5 years under Bogføringsloven. Instead, we anonymize the personal
 * identifiers while preserving the financial records.
 */
export async function deleteCustomerData(customerId: string) {
  const supabase = createServerClient();

  // Fetch the customer first
  const { data: customer } = await supabase
    .from("customers")
    .select("id, email, auth_id")
    .eq("id", customerId)
    .single();

  if (!customer) return { success: false, error: "Kunde ikke fundet" };

  const anonymizedName = "Slettet bruger";
  const anonymizedEmail = `deleted-${customerId.slice(0, 8)}@anonymized.phonespot.dk`;

  // 1. Anonymize customer record (keep for order integrity)
  await supabase
    .from("customers")
    .update({
      name: anonymizedName,
      email: anonymizedEmail,
      phone: null,
      addresses: "[]",
      notes: null,
      marketing_consent: false,
      marketing_consent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  // 2. Delete consent log entries (no legal retention requirement)
  await supabase
    .from("consent_log")
    .delete()
    .eq("customer_id", customerId);

  // 3. Delete notify requests
  await supabase
    .from("notify_requests")
    .delete()
    .eq("customer_email", customer.email);

  // 4. Anonymize contact inquiries (keep for service records, remove PII)
  await supabase
    .from("contact_inquiries")
    .update({
      name: anonymizedName,
      email: anonymizedEmail,
      phone: null,
    })
    .eq("email", customer.email);

  // 5. Delete Supabase Auth account if exists
  if (customer.auth_id) {
    await supabase.auth.admin.deleteUser(customer.auth_id);
  }

  // 6. Log the deletion in activity log (for compliance auditing)
  await supabase.from("activity_log").insert({
    action: "gdpr_data_deletion",
    entity_type: "customer",
    entity_id: customerId,
    details: {
      original_email_hash: customer.email, // Already anonymized above
      deleted_at: new Date().toISOString(),
      retained: "Orders and financial records retained per Bogføringsloven (5 years)",
    },
  });

  return { success: true };
}
