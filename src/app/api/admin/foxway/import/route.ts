import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { parseFoxwayCSV } from "@/lib/foxway/parser";
import { previewSync, syncFoxwayItems } from "@/lib/foxway/sync";
import type { SyncItemWithPrice } from "@/lib/foxway/sync";
import { calculateSellPrice } from "@/lib/foxway/pricing";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const isPreview = searchParams.get("preview") === "true";
  const isSync = searchParams.get("sync") === "true";

  if (!isPreview && !isSync) {
    return NextResponse.json(
      { error: "Query param ?preview=true or ?sync=true is required" },
      { status: 400 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "A CSV file is required in the 'file' field" },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const parsed = parseFoxwayCSV(csvText);

    if (isPreview) {
      const preview = await previewSync(parsed.items, supabase);
      return NextResponse.json({
        ...preview,
        parseStats: {
          totalRows: parsed.totalRows,
          skipped: parsed.skipped,
          errors: parsed.errors,
        },
      });
    }

    // Sync mode
    const priceOverridesRaw = formData.get("priceOverrides");
    const priceOverrides: Record<string, number> = priceOverridesRaw
      ? JSON.parse(priceOverridesRaw as string)
      : {};

    const itemsWithPrices: SyncItemWithPrice[] = parsed.items.map((item) => ({
      ...item,
      sellPrice:
        priceOverrides[item.sourceSku] ??
        calculateSellPrice(item.buyPrice, item.grade),
    }));

    const result = await syncFoxwayItems(itemsWithPrices, supabase);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("foxway_import_log")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
