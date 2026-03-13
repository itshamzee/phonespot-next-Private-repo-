/**
 * SAF-T (Standard Audit File for Tax) export.
 *
 * Generates SAF-T v2 XML for Danish SKAT compliance (Bogføringsloven).
 * Covers: orders, refunds, VAT (including brugtmoms), customers.
 *
 * Reference: OECD SAF-T schema + Danish Skattestyrelsen requirements.
 */

import { createServerClient } from "@/lib/supabase/client";

type SaftPeriod = {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
};

type SaftCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type SaftTransaction = {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  type: string;
  payment_method: string | null;
  customer_id: string | null;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    vat_scheme: string;
    vat_amount: number;
  }[];
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(oere: number): string {
  return (oere / 100).toFixed(2);
}

/**
 * Generate SAF-T XML for a given period.
 */
export async function generateSaftExport(period: SaftPeriod): Promise<string> {
  const supabase = createServerClient();

  // Fetch orders in period
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, order_number, created_at, total, status, type, payment_method, customer_id,
      order_items ( description, quantity, unit_price, total, vat_scheme, vat_amount )
    `)
    .gte("created_at", `${period.startDate}T00:00:00`)
    .lte("created_at", `${period.endDate}T23:59:59`)
    .in("status", ["confirmed", "shipped", "delivered", "refunded"])
    .order("created_at", { ascending: true });

  // Collect unique customer IDs
  const customerIds = [
    ...new Set((orders ?? []).map((o) => o.customer_id).filter(Boolean)),
  ] as string[];

  // Fetch customers
  let customers: SaftCustomer[] = [];
  if (customerIds.length > 0) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .in("id", customerIds);
    customers = (data ?? []) as SaftCustomer[];
  }

  // Calculate totals
  let totalDebit = 0;
  let totalCredit = 0;
  let totalVat = 0;
  let totalBrugtmoms = 0;

  for (const order of orders ?? []) {
    const items = order.order_items as SaftTransaction["items"];
    if (order.status === "refunded") {
      totalCredit += order.total;
    } else {
      totalDebit += order.total;
    }
    for (const item of items ?? []) {
      if (item.vat_scheme === "brugtmoms") {
        totalBrugtmoms += item.vat_amount ?? 0;
      } else {
        totalVat += item.vat_amount ?? 0;
      }
    }
  }

  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<AuditFile xmlns="urn:StandardAuditFile-Taxation-Financial:DK" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;

  // Header
  xml += `  <Header>\n`;
  xml += `    <AuditFileVersion>2.0</AuditFileVersion>\n`;
  xml += `    <AuditFileCountry>DK</AuditFileCountry>\n`;
  xml += `    <AuditFileDateCreated>${now.split("T")[0]}</AuditFileDateCreated>\n`;
  xml += `    <SoftwareCompanyName>PhoneSpot</SoftwareCompanyName>\n`;
  xml += `    <SoftwareID>PhoneSpot Platform</SoftwareID>\n`;
  xml += `    <SoftwareVersion>1.0</SoftwareVersion>\n`;
  xml += `    <Company>\n`;
  xml += `      <RegistrationNumber>44588819</RegistrationNumber>\n`;
  xml += `      <Name>PhoneSpot ApS</Name>\n`;
  xml += `      <Address>\n`;
  xml += `        <StreetName>Kongensgade 18</StreetName>\n`;
  xml += `        <City>Esbjerg</City>\n`;
  xml += `        <PostalCode>6700</PostalCode>\n`;
  xml += `        <Country>DK</Country>\n`;
  xml += `      </Address>\n`;
  xml += `    </Company>\n`;
  xml += `    <DefaultCurrencyCode>DKK</DefaultCurrencyCode>\n`;
  xml += `    <SelectionCriteria>\n`;
  xml += `      <SelectionStartDate>${period.startDate}</SelectionStartDate>\n`;
  xml += `      <SelectionEndDate>${period.endDate}</SelectionEndDate>\n`;
  xml += `    </SelectionCriteria>\n`;
  xml += `  </Header>\n`;

  // Master files — Customers
  xml += `  <MasterFiles>\n`;
  xml += `    <Customers>\n`;
  for (const c of customers) {
    xml += `      <Customer>\n`;
    xml += `        <CustomerID>${escapeXml(c.id)}</CustomerID>\n`;
    xml += `        <Name>${escapeXml(c.name ?? "Ukendt")}</Name>\n`;
    xml += `        <Contact>${escapeXml(c.email)}</Contact>\n`;
    if (c.phone) xml += `        <Telephone>${escapeXml(c.phone)}</Telephone>\n`;
    xml += `      </Customer>\n`;
  }
  xml += `    </Customers>\n`;

  // Tax table
  xml += `    <TaxTable>\n`;
  xml += `      <TaxTableEntry>\n`;
  xml += `        <TaxType>MVA</TaxType>\n`;
  xml += `        <Description>Standard dansk moms 25%</Description>\n`;
  xml += `        <TaxCodeDetails>\n`;
  xml += `          <TaxCode>S25</TaxCode>\n`;
  xml += `          <TaxPercentage>25.00</TaxPercentage>\n`;
  xml += `        </TaxCodeDetails>\n`;
  xml += `      </TaxTableEntry>\n`;
  xml += `      <TaxTableEntry>\n`;
  xml += `        <TaxType>MVA</TaxType>\n`;
  xml += `        <Description>Brugtmoms (momslovens §69-71)</Description>\n`;
  xml += `        <TaxCodeDetails>\n`;
  xml += `          <TaxCode>BRUGT</TaxCode>\n`;
  xml += `          <TaxPercentage>25.00</TaxPercentage>\n`;
  xml += `          <BaseRate>margin</BaseRate>\n`;
  xml += `        </TaxCodeDetails>\n`;
  xml += `      </TaxTableEntry>\n`;
  xml += `    </TaxTable>\n`;
  xml += `  </MasterFiles>\n`;

  // General Ledger Entries
  xml += `  <GeneralLedgerEntries>\n`;
  xml += `    <NumberOfEntries>${(orders ?? []).length}</NumberOfEntries>\n`;
  xml += `    <TotalDebit>${formatAmount(totalDebit)}</TotalDebit>\n`;
  xml += `    <TotalCredit>${formatAmount(totalCredit)}</TotalCredit>\n`;

  for (const order of orders ?? []) {
    const items = order.order_items as SaftTransaction["items"];
    const isRefund = order.status === "refunded";

    xml += `    <Journal>\n`;
    xml += `      <JournalID>SALES</JournalID>\n`;
    xml += `      <Description>Salg</Description>\n`;
    xml += `      <Transaction>\n`;
    xml += `        <TransactionID>${escapeXml(order.id)}</TransactionID>\n`;
    xml += `        <Period>${new Date(order.created_at).getMonth() + 1}</Period>\n`;
    xml += `        <TransactionDate>${order.created_at.split("T")[0]}</TransactionDate>\n`;
    xml += `        <TransactionType>${isRefund ? "refund" : "sale"}</TransactionType>\n`;
    xml += `        <Description>Ordre ${escapeXml(order.order_number)}</Description>\n`;
    if (order.customer_id) {
      xml += `        <CustomerID>${escapeXml(order.customer_id)}</CustomerID>\n`;
    }

    for (const item of items ?? []) {
      const taxCode = item.vat_scheme === "brugtmoms" ? "BRUGT" : "S25";
      xml += `        <Line>\n`;
      xml += `          <Description>${escapeXml(item.description ?? "Vare")}</Description>\n`;
      xml += `          <DebitAmount>${isRefund ? "0.00" : formatAmount(item.total)}</DebitAmount>\n`;
      xml += `          <CreditAmount>${isRefund ? formatAmount(item.total) : "0.00"}</CreditAmount>\n`;
      xml += `          <TaxInformation>\n`;
      xml += `            <TaxCode>${taxCode}</TaxCode>\n`;
      xml += `            <TaxAmount>${formatAmount(item.vat_amount ?? 0)}</TaxAmount>\n`;
      xml += `          </TaxInformation>\n`;
      xml += `        </Line>\n`;
    }

    xml += `      </Transaction>\n`;
    xml += `    </Journal>\n`;
  }

  xml += `  </GeneralLedgerEntries>\n`;
  xml += `</AuditFile>\n`;

  return xml;
}
