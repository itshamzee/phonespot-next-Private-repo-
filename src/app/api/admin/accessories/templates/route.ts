import { NextResponse } from "next/server";
import { getTemplates, createTemplate, deleteTemplate } from "@/lib/supabase/accessories";

export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json(templates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { name, category } = body;

  if (!name || !category) {
    return NextResponse.json(
      { error: "name og category er påkrævet" },
      { status: 400 }
    );
  }

  try {
    const template = await createTemplate({
      name: String(name),
      category: String(category),
      default_price: body.default_price !== undefined ? Number(body.default_price) : null,
      default_cost_price:
        body.default_cost_price !== undefined ? Number(body.default_cost_price) : null,
      image_url: body.image_url ? String(body.image_url) : null,
      description: body.description ? String(body.description) : null,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id er påkrævet" }, { status: 400 });
  }

  try {
    await deleteTemplate(String(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
