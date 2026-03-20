// GET  /api/platform/categories — list categories (optional ?product_type filter)
// POST /api/platform/categories — create a category
// PATCH /api/platform/categories — update a category
// DELETE /api/platform/categories — soft-delete (set is_active = false)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  let query = supabase
    .from("categories")
    .select("*, parent:categories!parent_id(id, name, slug)")
    .order("sort_order");

  const productType = params.get("product_type");
  if (productType) query = query.eq("product_type", productType);

  const activeOnly = params.get("active");
  if (activeOnly === "true") query = query.eq("is_active", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug, parent_id, product_type, sort_order } = body;

  if (!name || !slug || !product_type) {
    return NextResponse.json(
      { error: "name, slug, and product_type are required" },
      { status: 400 }
    );
  }

  const validTypes = ["device", "accessory", "spare-part"];
  if (!validTypes.includes(product_type)) {
    return NextResponse.json(
      { error: `product_type must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Slug "${slug}" is already in use` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      parent_id: parent_id ?? null,
      product_type,
      sort_order: sort_order ?? 0,
    })
    .select("*, parent:categories!parent_id(id, name, slug)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const allowed = ["name", "slug", "parent_id", "sort_order", "is_active", "product_type"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) {
      patch[key] = updates[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Prevent circular parent reference
  if (patch.parent_id === id) {
    return NextResponse.json(
      { error: "A category cannot be its own parent" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // If slug is being changed, check uniqueness
  if (patch.slug) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", patch.slug as string)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Slug "${patch.slug}" is already in use` },
        { status: 409 }
      );
    }
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id)
    .select("*, parent:categories!parent_id(id, name, slug)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Soft-delete: set is_active = false
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
