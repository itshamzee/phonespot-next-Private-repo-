import { readFileSync } from "fs";
const d = JSON.parse(readFileSync("scripts/shopify-products-dump.json", "utf8"));

const devices = d.filter(p => {
  const tags = (p.tags || "").toLowerCase();
  const title = p.title.toLowerCase();
  const hasGradeVariants = p.options.some(o =>
    o.name.toLowerCase().includes("stand") || o.name.toLowerCase().includes("lager")
  );
  const isDevice = (tags.includes("iphone") || tags.includes("ipad") || title.includes("samsung galaxy")) &&
                   p.variants.length > 1 && hasGradeVariants;
  return isDevice;
});

console.log("Device products (with storage/grade variants):", devices.length);
devices.forEach(p => {
  const opts = p.options.map(o => o.name).join(", ");
  const storages = p.options.find(o => o.name.toLowerCase().includes("lager"));
  const colors = p.options.find(o => o.name.toLowerCase().includes("farve"));
  console.log(`  - ${p.title}`);
  console.log(`    Options: ${opts}`);
  console.log(`    Storages: ${storages?.values?.join(", ") || "none"}`);
  console.log(`    Colors: ${colors?.values?.join(", ") || "none"}`);
  console.log(`    Variants: ${p.variants.length}, Price range: ${p.variants.map(v => v.price).sort()[0]} - ${p.variants.map(v => v.price).sort().pop()}`);
});
