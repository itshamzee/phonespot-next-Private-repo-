import { describe, expect, it } from "vitest";
import { extractImageUrls, matchModels, parseSupplierPaste, suggestTitle } from "../supplier-paste";

// Ren tekst som Chrome lægger i udklipsholderen ved Ctrl+A/Ctrl+C på en EMC-produktside.
const EMC_TEXT = `
Home → Accessories → Cases and Covers → Rixus Duo Magnetic Detachable Wallet For Apple iPhone 17 Pro, 18 Pro Black
Rixus Duo Magnetic Detachable Wallet For Apple iPhone 17 Pro, 18 Pro Black
Article number	RIX03631
Advised price	€29.95
Manufacturer	Rixus
Compatible with
Device Brands	For Apple
Series	For iPhone
Models	iPhone 18 Pro, iPhone 17 Pro
Model codes	A3256, A3523, A3522, A3524
Compatible With	Apple iPhone 17 Pro, Apple iPhone 18 Pro
€5.95
Related Products
Product Information
Rixus Duo Magnetic Detachable Wallet For Apple iPhone 17 Pro, 18 Pro Black
The Rixus Duo Magnetic Detachable Wallet for Apple iPhone 17 Pro and 18 Pro in black is a versatile accessory designed for the modern user. Crafted from durable plastic and TPU materials, this protective case offers robust protection while maintaining a sleek profile.
This phone case is tailored to fit the contours of the iPhone 17 Pro and 18 Pro precisely, ensuring a snug fit without compromising accessibility to ports and buttons.
Benefits
The magnetic detachable feature allows for quick and easy removal of the wallet section.
Its durable construction offers reliable protection against daily wear and tear.
The precise fit ensures full access to all ports and buttons without obstruction.
Compatible with
Device Brands	For Apple
Technical specifications
Product Group	Accessory
Product Type	Phone Case
Case Type	Protective case
MagSafe	Yes
Material	Plastic, TPU
Color	Black
What's included in the box?	1 x Phone case
`;

const EMC_HTML = `
<img src="https://cdn.emc.example/images/logo.svg"><img src="https://cdn.emc.example/media/RIX03631_1.jpg?w=1200">
<img data-src="https://cdn.emc.example/media/RIX03631_2.jpg"><img src="https://cdn.emc.example/flags/en.png">
<img src="https://cdn.emc.example/media/RIX03631_1.jpg?w=1200">
`;

describe("parseSupplierPaste", () => {
  const p = parseSupplierPaste(EMC_TEXT, EMC_HTML);

  it("finder titel, artikelnummer, mærke og priser", () => {
    expect(p.title).toBe("Rixus Duo Magnetic Detachable Wallet For Apple iPhone 17 Pro, 18 Pro Black");
    expect(p.articleNumber).toBe("RIX03631");
    expect(p.brand).toBe("Rixus");
    expect(p.advisedPriceEur).toBe(29.95);
    expect(p.priceEur).toBe(5.95);
  });

  it("matcher modeller mod vores liste, inkl. iPhone 18", () => {
    expect(p.modelLabels).toEqual(["iPhone 18 Pro", "iPhone 17 Pro"]);
    expect(p.modelSlugs).toEqual(["iphone-18-pro", "iphone-17-pro"]);
    expect(p.unknownModels).toEqual([]);
    expect(p.modelCodes).toEqual(["A3256", "A3523", "A3522", "A3524"]);
  });

  it("læser specs, fordele og beskrivelse", () => {
    expect(p.specs).toMatchObject({ case_type: "Protective case", magsafe: "Yes", material: "Plastic, TPU", color: "Black" });
    expect(p.benefits).toHaveLength(3);
    expect(p.benefits[0]).toMatch(/^The magnetic detachable/);
    expect(p.description).toMatch(/^The Rixus Duo Magnetic/);
    expect(p.description).toContain("\n\nThis phone case");
  });

  it("gætter kategori og attributter fra titlen", () => {
    expect(p.guess).toEqual({ subcategory: "cover", attributes: { case_type: "Wallet" } });
  });

  it("tager kun produktbilleder fra HTML, uden dubletter og ikoner", () => {
    expect(p.imageUrls).toEqual(["https://cdn.emc.example/media/RIX03631_1.jpg?w=1200", "https://cdn.emc.example/media/RIX03631_2.jpg"]);
  });

  it("foreslår en kort titel med {model}", () => {
    expect(suggestTitle(p)).toBe("Rixus Duo Magnetic Detachable Wallet {model}");
  });
});

describe("matchModels", () => {
  it("håndterer Apple-præfiks og kombinerede labels", () => {
    expect(matchModels(["Apple iPhone 17 Pro Max", "iPhone 16e", "Nokia 3310"])).toEqual({
      slugs: ["iphone-17-pro-max", "iphone-17e"],
      unknown: ["Nokia 3310"],
    });
  });
});

describe("extractImageUrls", () => {
  it("ignorerer svg og relative stier", () => {
    expect(extractImageUrls('<img src="/rel.jpg"><img src="https://x/a.svg"><img src="https://x/a.webp">')).toEqual(["https://x/a.webp"]);
  });
});
