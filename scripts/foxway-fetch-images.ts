// scripts/foxway-fetch-images.ts
//
// Henter produktbilleder til de laptop-skabeloner (product_templates.category = 'laptop')
// der mangler billeder, via leverandøren Foxways egne produktsider (devices.source_url).
//
// PhoneSpot er Foxway-forhandler — leverandørens produktbilleder til videresalg er normal
// praksis. Der hentes UDELUKKENDE billeder fra foxway.dk-produktsiderne, og kun rigtige
// produktfotos (aldrig logoer/generiske placeholders). Der fabrikeres intet: findes der
// ikke et brugbart billede, springes skabelonen over og listes i rapporten til manuel
// opfølgning.
//
// Kørsel:
//   npx tsx scripts/foxway-fetch-images.ts --dry-run           # rapporter dækning, skriv intet
//   npx tsx scripts/foxway-fetch-images.ts                     # rigtig kørsel: uploader + opdaterer DB
//   npx tsx scripts/foxway-fetch-images.ts --dry-run --limit=10  # test på et lille udsnit
//
// Rate-limit: højst ~2 requests/sekund mod foxway.dk (både HTML-sider og billed-downloads
// går igennem samme rate-limiter).
//
// Fallback (lavrisiko-udvidelse, reviewer-godkendt 2026-08-17): når INGEN device på en
// skabelon har source_url, men en device har source_sku, afledes en kandidat-URL efter
// Foxways kanoniske mønster https://en.foxway.dk/item/<sku lowercased, URL-encoded>. Denne
// kandidat er KUN et fallback-forsøg — den skal stadig bestå de samme sikkerhedstjek som en
// rigtig source_url (HTTP 200 + ægte JSON-LD-produktbillede), ellers logges skip som normalt.
// Skabeloner med eksisterende billeder overskrives aldrig.

import fs from "node:fs";
import path from "node:path";

// Indlæs .env.local FØR imports der læser env (samme mønster som scripts/foxway-reimport.ts).
const envPath = path.resolve(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

const BUCKET = "product-images";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MIN_REQUEST_INTERVAL_MS = 550; // holder os under 2 req/sek med margin
const MAX_DEVICE_URLS_PER_TEMPLATE = 3; // prøv op til 3 devices' source_url pr. skabelon
const MAX_IMAGES_PER_TEMPLATE = 3;

type TemplateRow = { id: string; brand: string; model: string; slug: string; images: string[] };
type DeviceRow = { template_id: string; source_url: string | null };
type DeviceSkuRow = { template_id: string; source_url: string | null; source_sku: string | null };

type ResultStatus =
  | "uploaded"
  | "would_upload"
  | "reused_existing_asset"
  | "no_source_url"
  | "no_image_found"
  | "fetch_failed";

type Result = { slug: string; brand: string; model: string; status: ResultStatus; detail?: string };

// ---------------------------------------------------------------------------
// Rate-limited fetch — global, gælder for ALLE requests mod foxway.dk (HTML + billeder)
// ---------------------------------------------------------------------------
let lastRequestAt = 0;
async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  return fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...(init?.headers ?? {}) },
  });
}

// ---------------------------------------------------------------------------
// Billed-udtræk fra Foxway-produktsiden
// ---------------------------------------------------------------------------

/**
 * Foxways og:image-tag falder tilbage til bare domænet ("https://en.foxway.dk") når der
 * ikke er noget rigtigt billede — det er IKKE et brugbart produktfoto. Vi filtrerer det
 * fra sammen med alt der ikke ligner en billedfil.
 */
function isRealFoxwayImage(url: string | undefined | null): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^https?:\/\/en\.foxway\.dk\/?$/i.test(trimmed)) return false; // generisk fallback, ikke et billede
  if (!/\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(trimmed)) return false;
  return true;
}

function collectImagesFromLdJsonValue(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectImagesFromLdJsonValue);
  if (typeof value === "object" && value !== null && "url" in value) {
    const url = (value as { url?: unknown }).url;
    return typeof url === "string" ? [url] : [];
  }
  return [];
}

/**
 * Udtræk produktbillede-URL'er fra en Foxway-produktside.
 * Prioritet: 1) JSON-LD (schema.org Product.image) — mest robust, indeholder det faktiske
 * produktfoto. 2) og:image som fallback (i praksis ubrugelig på Foxway, se isRealFoxwayImage).
 */
function extractImageUrls(html: string): string[] {
  const found = new Set<string>();

  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const candidates = Array.isArray(data) ? data : [data];
      for (const c of candidates) {
        const imgs = collectImagesFromLdJsonValue((c as { image?: unknown })?.image);
        for (const img of imgs) {
          if (isRealFoxwayImage(img)) found.add(img);
        }
      }
    } catch {
      // ignorer ugyldig JSON-LD og forsæt
    }
  }

  if (found.size === 0) {
    const og = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (og && isRealFoxwayImage(og[1])) found.add(og[1]);
  }

  return [...found].slice(0, MAX_IMAGES_PER_TEMPLATE);
}

function extFromUrl(url: string): string {
  const clean = url.split(/[?#]/)[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  return ext && /^(jpg|jpeg|png|webp)$/.test(ext) ? ext : "jpg";
}

/**
 * Foxways kanoniske URL-mønster for en produktside er https://en.foxway.dk/item/<sku>,
 * hvor <sku> er device.source_sku lowercased og URL-encoded (fx "#" -> "%23"). Verificeret
 * mod 15 devices der har BÅDE source_url og source_sku sat — formlen matcher source_url i
 * alle 15 tilfælde. Bruges KUN som fallback når ingen device på skabelonen har source_url,
 * og kandidaten skal stadig bestå de samme sikkerhedstjek (HTTP 200 + ægte JSON-LD-billede)
 * som en rigtig source_url, før den bruges.
 */
function deriveCandidateUrlFromSku(sku: string): string {
  return `https://en.foxway.dk/item/${encodeURIComponent(sku.toLowerCase())}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  console.log(`=== Foxway produktbillede-hentning ${dryRun ? "(DRY RUN — skriver intet)" : "(PRODUKTION)"} ===\n`);

  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const supabase = createAdminClient();

  // -------------------------------------------------------------------
  // Step 1: Inventér eksisterende assets i product-images-bucketen
  // -------------------------------------------------------------------
  console.log("--- Step 1: Inventér product-images-bucketen ---");
  const { data: topLevel, error: bucketErr } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
  if (bucketErr) throw bucketErr;
  const folderNames = new Set((topLevel ?? []).filter((e) => !e.id).map((e) => e.name)); // mapper (ingen id = mappe)
  const rootFileNames = (topLevel ?? []).filter((e) => e.id).map((e) => e.name); // filer i roden
  console.log(`Mapper i bucket: ${[...folderNames].join(", ") || "(ingen)"}`);
  console.log(`Filer i bucket-roden: ${rootFileNames.join(", ") || "(ingen)"}\n`);

  // -------------------------------------------------------------------
  // Step 2: Hent laptop-skabeloner uden billeder + deres devices' source_url
  // -------------------------------------------------------------------
  console.log("--- Step 2: Hent Foxway-produktsider for skabeloner uden billeder ---");
  const { data: allTemplates, error: tplErr } = await supabase
    .from("product_templates")
    .select("id, brand, model, slug, images")
    .eq("category", "laptop")
    .order("slug");
  if (tplErr) throw tplErr;

  const targets = ((allTemplates ?? []) as TemplateRow[])
    .filter((t) => !t.images || t.images.length === 0)
    .slice(0, limit);

  console.log(
    `${targets.length} laptop-skabeloner uden billeder (af ${allTemplates?.length ?? 0} laptop-skabeloner total)\n`
  );

  const templateIds = targets.map((t) => t.id);
  const urlsByTemplate = new Map<string, string[]>();
  if (templateIds.length > 0) {
    const { data: devices, error: devErr } = await supabase
      .from("devices")
      .select("template_id, source_url")
      .in("template_id", templateIds)
      .not("source_url", "is", null);
    if (devErr) throw devErr;
    for (const d of (devices ?? []) as DeviceRow[]) {
      if (!d.source_url) continue;
      const arr = urlsByTemplate.get(d.template_id) ?? [];
      if (!arr.includes(d.source_url)) arr.push(d.source_url);
      urlsByTemplate.set(d.template_id, arr);
    }
  }

  // -------------------------------------------------------------------
  // Fallback: for skabeloner uden NOGEN device med source_url, afled en kandidat-URL fra
  // device.source_sku efter Foxways kanoniske mønster (se deriveCandidateUrlFromSku).
  // Bruges KUN når source_url mangler helt — alle øvrige sikkerhedstjek nedenfor gælder
  // uændret for disse kandidater (HTTP 200 + ægte JSON-LD-billede).
  // -------------------------------------------------------------------
  const templateIdsMissingSourceUrl = templateIds.filter((id) => (urlsByTemplate.get(id) ?? []).length === 0);
  const derivedUrlsByTemplate = new Map<string, string[]>();
  if (templateIdsMissingSourceUrl.length > 0) {
    const { data: devicesNoUrl, error: devSkuErr } = await supabase
      .from("devices")
      .select("template_id, source_url, source_sku")
      .in("template_id", templateIdsMissingSourceUrl)
      .is("source_url", null)
      .not("source_sku", "is", null);
    if (devSkuErr) throw devSkuErr;
    for (const d of (devicesNoUrl ?? []) as DeviceSkuRow[]) {
      if (!d.source_sku) continue;
      const candidate = deriveCandidateUrlFromSku(d.source_sku);
      const arr = derivedUrlsByTemplate.get(d.template_id) ?? [];
      if (!arr.includes(candidate)) arr.push(candidate);
      derivedUrlsByTemplate.set(d.template_id, arr);
    }
    console.log(
      `Fallback (afledt fra source_sku): ${derivedUrlsByTemplate.size} af ${templateIdsMissingSourceUrl.length} skabeloner uden source_url fik mindst én kandidat-URL\n`
    );
  }

  const results: Result[] = [];

  for (const tpl of targets) {
    const base = { slug: tpl.slug, brand: tpl.brand, model: tpl.model };

    // Genbrug fra bucket, hvis en mappe/fil allerede matcher denne skabelons slug (Step 1-krav).
    if (folderNames.has(tpl.slug)) {
      const { data: files } = await supabase.storage.from(BUCKET).list(tpl.slug, { limit: 20 });
      const imageFiles = (files ?? []).filter((f) => f.id && /\.(jpg|jpeg|png|webp)$/i.test(f.name));
      if (imageFiles.length > 0) {
        const urls = imageFiles.map(
          (f) => supabase.storage.from(BUCKET).getPublicUrl(`${tpl.slug}/${f.name}`).data.publicUrl
        );
        console.log(`[GENBRUG] ${tpl.slug} — fandt ${urls.length} eksisterende fil(er) i bucket-mappen "${tpl.slug}"`);
        if (!dryRun) {
          const { error: updateErr } = await supabase.from("product_templates").update({ images: urls }).eq("id", tpl.id);
          if (updateErr) {
            results.push({ ...base, status: "fetch_failed", detail: `DB-opdatering fejlede: ${updateErr.message}` });
            continue;
          }
        }
        results.push({ ...base, status: dryRun ? "would_upload" : "reused_existing_asset", detail: urls.join(", ") });
        continue;
      }
    }

    let candidateUrls = urlsByTemplate.get(tpl.id) ?? [];
    let usingDerivedFallback = false;
    if (candidateUrls.length === 0) {
      // Fallback: ingen device har source_url — prøv URL(er) afledt af source_sku i stedet.
      const derived = derivedUrlsByTemplate.get(tpl.id) ?? [];
      if (derived.length > 0) {
        candidateUrls = derived;
        usingDerivedFallback = true;
      } else {
        console.log(`[SPRING OVER] ${tpl.slug} — ingen tilknyttet device har source_url eller source_sku`);
        results.push({ ...base, status: "no_source_url" });
        continue;
      }
    }

    let pageResult: { pageUrl: string; statusCode: number; imageUrls: string[] } | null = null;
    let lastError = "";
    for (const sourceUrl of candidateUrls.slice(0, MAX_DEVICE_URLS_PER_TEMPLATE)) {
      try {
        const res = await rateLimitedFetch(sourceUrl);
        if (!res.ok) {
          lastError = `HTTP ${res.status} fra ${sourceUrl}${usingDerivedFallback ? " (afledt fra source_sku)" : ""}`;
          console.log(`  [${tpl.slug}] ${lastError}`);
          continue;
        }
        const html = await res.text();
        const imageUrls = extractImageUrls(html);
        if (imageUrls.length > 0) {
          pageResult = { pageUrl: sourceUrl, statusCode: res.status, imageUrls };
          break;
        }
        lastError = `Status 200 fra ${sourceUrl}${usingDerivedFallback ? " (afledt fra source_sku)" : ""}, men intet brugbart produktbillede fundet (og:image pegede kun på foxway.dk-forsiden, eller siden manglede JSON-LD)`;
        console.log(`  [${tpl.slug}] ${lastError}`);
      } catch (e) {
        lastError = `Netværksfejl ved ${sourceUrl}${usingDerivedFallback ? " (afledt fra source_sku)" : ""}: ${(e as Error).message}`;
        console.log(`  [${tpl.slug}] ${lastError}`);
      }
    }

    if (!pageResult) {
      results.push({ ...base, status: "no_image_found", detail: lastError });
      continue;
    }

    const originTag = usingDerivedFallback ? " [afledt fra source_sku]" : "";

    if (dryRun) {
      console.log(
        `[DRY] ${tpl.slug} — ville hente ${pageResult.imageUrls.length} billede(r) fra ${pageResult.pageUrl}${originTag}: ${pageResult.imageUrls.join(", ")}`
      );
      results.push({ ...base, status: "would_upload", detail: `${pageResult.imageUrls.join(", ")}${originTag}` });
      continue;
    }

    // Download + upload til Supabase Storage, skriv URL'erne til template.images
    try {
      const uploadedUrls: string[] = [];
      let n = 0;
      for (const imageUrl of pageResult.imageUrls) {
        n += 1;
        const imgRes = await rateLimitedFetch(imageUrl);
        if (!imgRes.ok) {
          console.log(`  [${tpl.slug}] billed-download fejlede (HTTP ${imgRes.status}) for ${imageUrl}`);
          continue;
        }
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        const storagePath = `laptops/${tpl.slug}-${n}.${extFromUrl(imageUrl)}`;

        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });
        if (uploadErr) {
          console.log(`  [${tpl.slug}] upload fejlede for ${storagePath}: ${uploadErr.message}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length === 0) {
        results.push({ ...base, status: "fetch_failed", detail: "Alle billed-downloads/uploads fejlede" });
        continue;
      }

      const { error: updateErr } = await supabase
        .from("product_templates")
        .update({ images: uploadedUrls })
        .eq("id", tpl.id);
      if (updateErr) {
        results.push({ ...base, status: "fetch_failed", detail: `DB-opdatering fejlede: ${updateErr.message}` });
        continue;
      }

      console.log(
        `[OK] ${tpl.slug} — ${uploadedUrls.length} billede(r) uploadet og skrevet til DB (fra ${pageResult.pageUrl})${originTag}`
      );
      results.push({ ...base, status: "uploaded", detail: `${uploadedUrls.join(", ")}${originTag}` });
    } catch (e) {
      results.push({ ...base, status: "fetch_failed", detail: (e as Error).message });
    }
  }

  // -------------------------------------------------------------------
  // Step 3: Opsummering / rapport
  // -------------------------------------------------------------------
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const covered = (counts.uploaded ?? 0) + (counts.would_upload ?? 0) + (counts.reused_existing_asset ?? 0);

  console.log("\n=== Opsummering ===");
  console.log(JSON.stringify(counts, null, 2));
  console.log(`Dækning: ${covered} / ${targets.length}`);

  const missing = results.filter(
    (r) => r.status === "no_source_url" || r.status === "no_image_found" || r.status === "fetch_failed"
  );
  if (missing.length > 0) {
    console.log(`\nSkabeloner UDEN billede (${missing.length}):`);
    for (const m of missing) {
      console.log(`  - ${m.brand} ${m.model} [${m.slug}] — ${m.status}${m.detail ? `: ${m.detail}` : ""}`);
    }
  }

  if (dryRun) {
    console.log("\nDry-run færdig. Kør uden --dry-run for at uploade billeder og opdatere databasen.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
