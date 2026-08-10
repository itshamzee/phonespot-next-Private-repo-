/**
 * Insert Apple MacBook Air 15" M4 (2025, A3241 / Mac16,13) into the catalog.
 *
 * Scenario: 1× real physical unit that arrived in the Vejle store.
 *   - Grade N (fabriksny — sealed, never opened, original packaging)
 *   - Apple M4, 10-core CPU / 10-core GPU
 *   - 24 GB unified memory, 512 GB SSD
 *   - Sky Blue
 *   - Selling at 11.499 kr, vat_scheme = "regular" (new goods — brugtmoms is
 *     only legal for genuinely second-hand stock)
 *   - Location: Vejle (resolved at runtime by name — never hardcode the UUID)
 *
 * What this does:
 *   1. Looks up the "Vejle" row in `locations` at runtime.
 *   2. Creates a `product_templates` row if not already present (idempotent
 *      on display_name).
 *   3. Inserts 1× device row (grade N, 512GB, Sky Blue) — idempotent: if a
 *      device already exists for this template with the same grade/storage/
 *      color, it is skipped rather than duplicated.
 *
 * Run (dry run first):
 *   npx tsx --env-file=.env.local scripts/insert-macbook-air-15-m4.ts --dry-run
 * Run for real:
 *   npx tsx --env-file=.env.local scripts/insert-macbook-air-15-m4.ts
 *
 * purchase_price = 0 — admin must update via UI for accounting/margin
 * accuracy (matches the convention used by the other insert-*.ts scripts;
 * the real cost of this unit is not known at the time of writing).
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const DRY_RUN = process.argv.includes("--dry-run");

const LOCATION_NAME = "Vejle";

const DISPLAY_NAME = "Apple MacBook Air 15 M4";
const SLUG = "apple-macbook-air-15-m4-24gb-512gb";

// Verified 2026-08-10: HTTP 200, Content-Type image/jpeg, visually confirmed
// as the open, front-facing Sky Blue 15" MacBook Air hero shot. Host
// store.storeimages.cdn-apple.com is allow-listed in next.config.ts.
const IMAGES: string[] = [
  "https://store.storeimages.cdn-apple.com/8756/as-images.apple.com/is/mba15-skyblue-select-202503?wid=1600&hei=1600&fmt=jpeg&qlt=95&.v=1",
];

const SHORT_DESC =
  'Fabriksny Apple MacBook Air 15,3" med M4-chip, 24 GB RAM og 512 GB SSD i Sky Blue. Forseglet i ubrudt originalemballage — kan afhentes i vores butik i Vejle i dag.';

const LONG_DESC = [
  "Denne MacBook Air 15\" M4 er fabriksny og forseglet i ubrudt originalemballage — den har stået i kassen siden den forlod Apples fabrik, og er ikke pakket ud eller brugt af nogen. Enheden står fysisk i vores butik i Vejle og kan afhentes samme dag.",
  "",
  "15,3\" Liquid Retina-skærmen giver skarpt, farverigtigt billede til alt fra kontorarbejde til billedredigering, og Apple M4-chippen med 10-core CPU og 10-core GPU gør maskinen hurtig og lydløs — MacBook Air har ingen blæser, så den kører helt stille uanset belastning.",
  "",
  "24 GB unified memory og 512 GB SSD giver rigelig plads til at have mange programmer og faner åbne samtidig, og nok lagerplads til billeder, dokumenter og applikationer i lang tid fremover. Batteriet holder til en hel arbejdsdag på én opladning.",
  "",
  "Farven er Sky Blue — Apples lyseblå finish med matchende blåt kabinet omkring tastatur og skærmramme.",
].join("\n");

const SPEC_BULLETS = [
  "• Model: Apple MacBook Air 15\" (2025) — modelnummer A3241, Mac16,13",
  "• Processor: Apple M4 — 10-core CPU, 10-core GPU",
  "• RAM: 24 GB unified memory",
  "• Lagring: 512 GB SSD",
  '• Skærm: 15,3" Liquid Retina (2880×1864)',
  "• Farve: Sky Blue",
  "• Kamera: 12MP Center Stage",
  "• Trådløst: Wi-Fi 6E + Bluetooth 5.3",
  "• Operativsystem: macOS",
  "• Vægt: 1,51 kg",
];

const WHY_NEW = [
  "Hvorfor fabriksny hos PhoneSpot?",
  "• Forseglet i ubrudt originalemballage — helt uåbnet og ubrugt",
  "• Fuld producent-garanti fra Apple plus 36 måneders garanti fra PhoneSpot",
  "• Kan afhentes i vores butik i Vejle i dag — ingen ventetid",
];

const CONDITION = [
  "Stand — Fabriksny",
  "• Forseglet i ubrudt originalemballage",
  "• Aldrig pakket ud eller brugt",
  "• 100 % batterikapacitet",
];

const WARRANTY = [
  "Garanti, returret & levering",
  "• 36 måneders garanti fra PhoneSpot — dækker fabrikationsfejl og funktionelle mangler",
  "• 14 dages fuld returret — du kan returnere uden begrundelse",
  "• Kan afhentes samme dag i vores butik i Vejle, eller sendes til hele Danmark",
];

const FULL_DESCRIPTION = [
  LONG_DESC,
  "",
  "Specifikationer",
  ...SPEC_BULLETS,
  "",
  ...WHY_NEW,
  "",
  ...CONDITION,
  "",
  ...WARRANTY,
].join("\n");

const TEMPLATE_PAYLOAD = {
  brand: "Apple",
  model: "MacBook Air 15 M4",
  category: "laptop",
  storage_options: ["512GB"],
  colors: ["Sky Blue"],
  default_attributes: {} as Record<string, unknown>,
  display_name: DISPLAY_NAME,
  slug: SLUG,
  short_description: SHORT_DESC,
  description: FULL_DESCRIPTION,
  images: IMAGES,
  specifications: {
    Model: 'A3241 (Mac16,13)',
    Processor: "Apple M4 — 10-core CPU, 10-core GPU",
    RAM: "24 GB unified memory",
    SSD: "512 GB",
    Skærm: '15,3" Liquid Retina (2880×1864)',
    Farve: "Sky Blue",
    Kamera: "12MP Center Stage",
    Trådløst: "Wi-Fi 6E + Bluetooth 5.3",
    OS: "macOS",
    Vægt: "1,51 kg",
  } as Record<string, string>,
  meta_title:
    'Apple MacBook Air 15" M4 | Sky Blue | 24 GB | 512 GB | Fabriksny | PhoneSpot',
  meta_description:
    'Fabriksny Apple MacBook Air 15" M4 i Sky Blue — 24 GB RAM, 512 GB SSD, forseglet i original emballage. Kan afhentes i butikken i Vejle i dag. 36 mdr. garanti hos PhoneSpot.',
  status: "published" as const,
  base_price_a: null,
  base_price_b: null,
  base_price_c: null,
  base_price_n: 1149900, // øre = 11.499 kr.
  base_price_p: null,
};

interface DeviceSpec {
  grade: "N" | "P" | "A" | "B" | "C";
  sellingPriceKr: number;
  storage: string;
  color: string;
  conditionNotes: string;
}

const DEVICE: DeviceSpec = {
  grade: "N",
  sellingPriceKr: 11499,
  storage: "512GB",
  color: "Sky Blue",
  conditionNotes:
    "Grade N — fabriksny, forseglet i ubrudt originalemballage, aldrig brugt. Apple M4 10-core CPU/10-core GPU, 24 GB RAM, 512 GB SSD, Sky Blue. Modtaget i butikken i Vejle.",
};

function generateBarcode(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const random = randomBytes(2).toString("hex").toUpperCase();
  return `PS-${yyyy}${mm}${dd}-${random}`;
}

async function main() {
  if (IMAGES.length === 0) {
    console.error("× Refusing to publish without images. Fill IMAGES[] first.");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("=== DRY RUN — no writes will be made ===\n");
  }

  console.log(`=== Resolving location: ${LOCATION_NAME} ===`);
  const { data: location, error: locErr } = await supabase
    .from("locations")
    .select("id, name")
    .eq("name", LOCATION_NAME)
    .single();

  if (locErr || !location) {
    console.error(`× could not resolve location "${LOCATION_NAME}": ${locErr?.message ?? "not found"}`);
    process.exit(1);
  }
  const locationId = location.id;
  console.log(`✓ location resolved: ${LOCATION_NAME} → ${locationId}`);

  console.log(`\n=== Looking up template: ${DISPLAY_NAME} ===`);
  const { data: existing, error: lookupErr } = await supabase
    .from("product_templates")
    .select("id, display_name, slug, status")
    .eq("display_name", DISPLAY_NAME);

  if (lookupErr) {
    console.error(`× lookup error: ${lookupErr.message}`);
    process.exit(1);
  }

  let templateId: string;
  if (existing && existing.length > 0) {
    templateId = existing[0].id;
    console.log(`✓ template already exists: ${templateId} (${existing[0].slug}, status=${existing[0].status})`);
  } else if (DRY_RUN) {
    console.log(`+ [dry-run] would create new template with slug "${SLUG}"`);
    templateId = "00000000-0000-0000-0000-000000000000"; // placeholder for dry-run device check below
  } else {
    console.log(`+ creating new template…`);
    const { data: inserted, error: insErr } = await supabase
      .from("product_templates")
      .insert(TEMPLATE_PAYLOAD)
      .select("id, slug")
      .single();
    if (insErr || !inserted) {
      console.error(`× insert template error: ${insErr?.message ?? "unknown"}`);
      process.exit(1);
    }
    templateId = inserted.id;
    console.log(`✓ template created: ${templateId} (${inserted.slug})`);
  }

  // ── Idempotency guard: skip if a matching device already exists ──
  // Barcodes are generated fresh each run, so we can't dedupe on barcode.
  // Instead, dedupe on (template, grade, storage, color) — for a single
  // real physical unit this combination is a reliable stand-in for "this
  // exact listing already exists".
  console.log(
    `\n=== Checking for existing device (grade ${DEVICE.grade}, ${DEVICE.storage}, ${DEVICE.color}) ===`,
  );
  if (!DRY_RUN || (existing && existing.length > 0)) {
    const { data: existingDevices, error: devLookupErr } = await supabase
      .from("devices")
      .select("id, barcode, status, selling_price")
      .eq("template_id", templateId)
      .eq("grade", DEVICE.grade)
      .eq("storage", DEVICE.storage)
      .eq("color", DEVICE.color);

    if (devLookupErr) {
      console.error(`× device lookup error: ${devLookupErr.message}`);
      process.exit(1);
    }

    if (existingDevices && existingDevices.length > 0) {
      console.log(
        `✓ device already exists — skipping insert: ${existingDevices[0].id} (barcode ${existingDevices[0].barcode}, status ${existingDevices[0].status})`,
      );
      console.log(`\n  Public URL: https://phonespot.dk/refurbished/${SLUG}`);
      return;
    }
    console.log(`  No existing device found — proceeding to insert.`);
  } else {
    console.log(`  [dry-run] template does not exist yet, so no device can exist either.`);
  }

  console.log(
    `\n=== ${DRY_RUN ? "[dry-run] Would insert" : "Inserting"} 1× device (Grade ${DEVICE.grade}, ${DEVICE.sellingPriceKr.toLocaleString("da-DK")} kr, vat_scheme=regular) ===`,
  );
  const now = new Date().toISOString();
  const barcode = generateBarcode();

  const devicePayload = {
    template_id: templateId,
    barcode,
    grade: DEVICE.grade,
    storage: DEVICE.storage,
    color: DEVICE.color,
    condition_notes: DEVICE.conditionNotes,
    selling_price: DEVICE.sellingPriceKr * 100,
    purchase_price: 0,
    vat_scheme: "regular",
    origin_country: "DK",
    location_id: locationId,
    status: "listed",
    photos: [] as string[],
    source: "internal",
    source_stock: 0,
    purchased_at: now,
    listed_at: now,
    created_at: now,
    updated_at: now,
  };

  if (DRY_RUN) {
    console.log("  [dry-run] device payload:");
    console.log(JSON.stringify(devicePayload, null, 2));
    console.log("\n=== DRY RUN COMPLETE — nothing was written ===");
    return;
  }

  const { error: devErr } = await supabase.from("devices").insert(devicePayload);
  if (devErr) {
    console.error(`× insert device error: ${devErr.message}`);
    process.exit(1);
  }

  console.log(`✓ device inserted [barcode: ${barcode}]`);
  console.log(
    `  Grade ${DEVICE.grade}  ${DEVICE.sellingPriceKr.toLocaleString("da-DK")} kr  ${DEVICE.color}  ${DEVICE.storage}  ${LOCATION_NAME}`,
  );

  console.log(`\n=== Verifying ===`);
  const { count } = await supabase
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId)
    .eq("status", "listed");
  console.log(`  Devices listed under this template: ${count}`);
  console.log(`  Public URL: https://phonespot.dk/refurbished/${SLUG}`);
  console.log(`\n  Reminder: update purchase_price via admin for accounting/margin accuracy.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
