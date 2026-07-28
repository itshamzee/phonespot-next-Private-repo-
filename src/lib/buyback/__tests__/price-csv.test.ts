import { describe, it, expect } from "vitest";
import { parsePriceCsv } from "../price-csv";

describe("parsePriceCsv", () => {
  it("parses a well-formed line and converts kroner to øre", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500");
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({
      deviceType: "Telefon",
      brand: "Apple",
      model: "iPhone 12",
      storage: "128GB",
      ram: "",
      basePriceOre: 250000,
    });
  });

  it("accepts tab-separated input pasted from a spreadsheet", () => {
    const { rows } = parsePriceCsv("Telefon\tApple\tiPhone 12\t128GB\t2500");
    expect(rows[0].basePriceOre).toBe(250000);
  });

  it("accepts Danish thousand separators", () => {
    expect(parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2.500").rows[0].basePriceOre).toBe(250000);
  });

  it("accepts a decimal comma only in tab-separated input", () => {
    // In comma-separated input a comma is the separator, so a decimal comma
    // cannot be told apart from a new column. Tabs have no such ambiguity.
    expect(parsePriceCsv("Telefon\tApple\tiPhone 12\t128GB\t2500,50").rows[0].basePriceOre).toBe(250050);
  });

  it("treats an empty storage column as no storage", () => {
    expect(parsePriceCsv("Telefon, Apple, iPhone 12, , 2500").rows[0].storage).toBe("");
  });

  it("reads an optional RAM column", () => {
    expect(parsePriceCsv("Laptop, Apple, MacBook Air, 256GB, 4500, 8GB").rows[0].ram).toBe("8GB");
  });

  it("skips blank lines", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500\n\n\n");
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("reports a line with too few columns", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, 2500");
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/linje 1/i);
  });

  it("reports a non-numeric price", () => {
    const { errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, tobehundrede");
    expect(errors[0]).toMatch(/linje 1/i);
  });

  it("reports a negative price", () => {
    expect(parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, -100").errors).toHaveLength(1);
  });

  it("keeps good lines and reports bad ones separately", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500\nnoget vrøvl");
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it("numbers the errors by their real line", () => {
    const { errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500\nTelefon, Apple, iPhone 11, 64GB, ikke-en-pris");
    expect(errors[0]).toMatch(/linje 2/i);
  });
});
