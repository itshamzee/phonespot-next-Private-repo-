import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { normalizeCvr } from "@/lib/repairs/cvr";

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_devices(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, name, email, phone, company_name, cvr, ean, invoice_email, contact_person } = body;

  if (!type || !name || !phone) {
    return NextResponse.json(
      { error: "Type, navn og telefon er paakraevet" },
      { status: 400 },
    );
  }

  if (type !== "privat" && type !== "erhverv") {
    return NextResponse.json({ error: "Vælg Privat eller Erhverv" }, { status: 400 });
  }
  const cvrNumber = type === "erhverv" && cvr?.toString().trim() ? normalizeCvr(cvr.toString()) : null;
  if (type === "erhverv" && cvr?.toString().trim() && !cvrNumber) {
    return NextResponse.json({ error: "CVR-nummer skal være 8 cifre" }, { status: 400 });
  }
  const eanDigits = type === "erhverv" ? (ean ?? "").toString().replace(/\D/g, "") : "";
  if (eanDigits && eanDigits.length !== 13) {
    return NextResponse.json({ error: "EAN-nummer skal være 13 cifre" }, { status: 400 });
  }
  const invoiceEmail = type === "erhverv" ? (invoice_email ?? "").toString().trim() : "";
  if (invoiceEmail && !/^[^@\s]+@[^@\s]+$/.test(invoiceEmail)) {
    return NextResponse.json({ error: "Fakturamailen er ikke en gyldig mailadresse" }, { status: 400 });
  }
  if (type === "erhverv" && !company_name?.toString().trim()) {
    return NextResponse.json({ error: "Skriv firmanavn for en erhvervskunde" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      type,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone.trim(),
      company_name: type === "erhverv" ? company_name?.trim() || null : null,
      cvr: cvrNumber,
      ean: eanDigits || null,
      invoice_email: invoiceEmail || null,
      contact_person: type === "erhverv" ? contact_person?.toString().trim() || null : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
