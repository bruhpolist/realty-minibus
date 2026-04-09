import { describe, expect, it } from "vitest";
import {
  convertBynToUsd,
  extractFeatures,
  isInPriceRange,
  normalizeDraftListing,
  parsePriceToBYN
} from "./utils.js";

describe("price parsing and range filter", () => {
  it("parses BYN amounts and keeps byn value", () => {
    expect(parsePriceToBYN("1200 BYN")).toBe(1200);
    expect(parsePriceToBYN("1 050 руб")).toBe(1050);
  });

  it("parses USD amounts and converts to BYN by rate 3.3", () => {
    expect(parsePriceToBYN("350 USD")).toBe(1155);
    expect(parsePriceToBYN("$400")).toBe(1320);
  });

  it("checks target range 990-1485 BYN", () => {
    expect(isInPriceRange(989)).toBe(false);
    expect(isInPriceRange(990)).toBe(true);
    expect(isInPriceRange(1485)).toBe(true);
    expect(isInPriceRange(1486)).toBe(false);
  });

  it("converts BYN to USD", () => {
    expect(convertBynToUsd(990)).toBe(300);
    expect(convertBynToUsd(1485)).toBe(450);
  });
});

describe("feature extraction and normalized listing", () => {
  it("extracts mapped features from description", () => {
    const features = extractFeatures([
      "Есть балкон, wi-fi, мебель, свежий ремонт и подземный паркинг."
    ]);

    expect(features).toEqual(
      expect.arrayContaining(["балкон", "wifi", "мебель", "ремонт", "паркинг"])
    );
  });

  it("skips listing outside allowed range", () => {
    const listing = normalizeDraftListing({
      source: "unit-test",
      url: "https://example.com/1",
      title: "1к квартира",
      priceText: "800 BYN",
      address: "Минск, Центр",
      description: "wifi",
      imageUrls: []
    });

    expect(listing).toBeNull();
  });

  it("normalizes listing inside allowed range", () => {
    const listing = normalizeDraftListing({
      source: "unit-test",
      url: "https://example.com/2",
      title: "2к квартира с балконом",
      priceText: "1100 BYN",
      address: "Минск, ул. Притыцкого 15",
      rooms: 2,
      area: 55,
      description: "wifi, мебель",
      imageUrls: ["https://cdn.example.com/1.jpg", "https://cdn.example.com/1.jpg"]
    });

    expect(listing).not.toBeNull();
    expect(listing?.priceUSD).toBeCloseTo(333.33, 2);
    expect(listing?.imageUrls).toHaveLength(1);
    expect(listing?.features).toEqual(expect.arrayContaining(["балкон", "wifi", "мебель"]));
  });
});
