import { NextRequest, NextResponse } from "next/server";
import {
  getSparePartProducts,
  getSparePartFilterOptions,
  type SparePartFilters,
} from "@/lib/supabase/spare-parts";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  if (url.searchParams.get("filters") === "true") {
    const options = await getSparePartFilterOptions();
    return NextResponse.json(options);
  }

  const filters: SparePartFilters = {};

  const category = url.searchParams.get("category");
  if (category) filters.categorySlug = category;

  const partCategory = url.searchParams.get("partCategory");
  if (partCategory) filters.partCategorySlug = partCategory;

  const sort = url.searchParams.get("sort") as any;
  if (sort && ["stock", "price_asc", "price_desc", "newest"].includes(sort)) {
    filters.sort = sort;
  }

  const brand = url.searchParams.get("brand");
  if (brand) filters.brand = brand;

  const series = url.searchParams.get("series");
  if (series) filters.series = series;

  const model = url.searchParams.get("model");
  if (model) filters.model = model;

  const quality = url.searchParams.get("quality");
  if (quality) filters.qualityTierSlug = quality;

  const search = url.searchParams.get("search");
  if (search) filters.search = search;

  const minPrice = url.searchParams.get("minPrice");
  if (minPrice) filters.minPrice = Number(minPrice);

  const maxPrice = url.searchParams.get("maxPrice");
  if (maxPrice) filters.maxPrice = Number(maxPrice);

  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "24"), 100);
  filters.limit = limit;
  filters.offset = (page - 1) * limit;

  const { products, total } = await getSparePartProducts(filters);

  return NextResponse.json({
    products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
