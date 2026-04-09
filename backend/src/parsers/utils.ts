import crypto from "node:crypto";
import { config } from "../config.js";
import { FEATURES, type FeatureTag, type NormalizedListing, type ScrapedDraftListing } from "./types.js";

const featureKeywords: Record<FeatureTag, string[]> = {
  "балкон": ["балкон", "лодж", "терас"],
  "интернет": ["интернет", "internet", "оптоволокно", "ethernet"],
  "wifi": ["wifi", "wi-fi", "вайфай", "вай фай"],
  "мебель": ["мебел", "меблирован", "диван", "шкаф", "кровать", "кухня"],
  "ремонт": ["ремонт", "евро", "новый дом", "новострой", "дизайнерский"],
  "охрана": ["охрана", "консьерж", "видеонаблюдение", "домофон"],
  "паркинг": ["паркинг", "парковка", "машиноместо", "подземный паркинг"]
};

const SPACES = /\s+/g;

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(SPACES, " ").trim();
}

export function toAbsoluteUrl(sourceUrl: string, baseUrl: string): string {
  try {
    return new URL(sourceUrl, baseUrl).toString();
  } catch {
    return sourceUrl;
  }
}

function parseAmount(raw: string): number | undefined {
  const normalized = raw.replace(/\s/g, "").replace(",", ".").match(/\d+(?:\.\d+)?/g);
  if (!normalized?.length) {
    return undefined;
  }

  const amount = Number(normalized.join(""));
  if (!Number.isFinite(amount)) {
    return undefined;
  }

  return amount;
}

export function parseRooms(value: string): number | undefined {
  const match = value.match(/(\d+)\s*[- ]?\s*(?:к|комн)/i) ?? value.match(/(^|\s)(\d)\s*к/i);
  const num = Number(match?.[1] ?? match?.[2]);
  return Number.isFinite(num) && num > 0 && num < 10 ? num : undefined;
}

export function parseArea(value: string): number | undefined {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв\.?\s*м)/i);
  if (!match) {
    return undefined;
  }

  const area = Number(match[1].replace(",", "."));
  return Number.isFinite(area) && area > 10 && area < 500 ? area : undefined;
}

export function parsePriceToBYN(priceText: string, usdRate = config.USD_RATE): number | undefined {
  const text = normalizeText(priceText);
  const amount = parseAmount(text);
  if (!amount) {
    return undefined;
  }

  const isUsd = /\$|usd|дол/i.test(text);
  const isByn = /byn|руб|br/i.test(text);

  if (isUsd && !isByn) {
    return Math.round(amount * usdRate * 100) / 100;
  }

  return amount;
}

export function convertBynToUsd(priceBYN: number, usdRate = config.USD_RATE): number {
  return Math.round((priceBYN / usdRate) * 100) / 100;
}

export function isInPriceRange(priceBYN: number): boolean {
  return priceBYN >= config.PRICE_MIN && priceBYN <= config.PRICE_MAX;
}

export function extractFeatures(texts: string[]): FeatureTag[] {
  const joined = normalizeText(texts.join(" "));
  const tags = FEATURES.filter((feature) => {
    return featureKeywords[feature].some((keyword) => joined.includes(keyword));
  });

  return tags;
}

export function normalizeDraftListing(draft: ScrapedDraftListing, usdRate = config.USD_RATE): NormalizedListing | null {
  const priceBYN = parsePriceToBYN(draft.priceText, usdRate);
  if (!priceBYN || !isInPriceRange(priceBYN)) {
    return null;
  }

  const features = extractFeatures([draft.description, draft.title ?? "", draft.address].concat(draft.priceText));

  return {
    source: draft.source,
    externalId: draft.externalId,
    url: draft.url,
    title: draft.title,
    priceBYN,
    priceUSD: convertBynToUsd(priceBYN, usdRate),
    address: draft.address.trim(),
    rooms: draft.rooms,
    area: draft.area,
    ownerType: draft.ownerType,
    ownerName: draft.ownerName?.trim() || undefined,
    description: draft.description.trim(),
    features,
    imageUrls: uniq(draft.imageUrls),
    sourceCreatedAt: parseDateSafe(draft.sourceCreatedAt),
    sourceUpdatedAt: parseDateSafe(draft.sourceUpdatedAt),
    sourcePriceChangeDate: parseDateSafe(draft.sourcePriceChangeDate)
  };
}

function parseDateSafe(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function listingHash(listing: NormalizedListing): string {
  const payload = {
    source: listing.source,
    externalId: listing.externalId ?? null,
    url: listing.url,
    priceBYN: listing.priceBYN,
    address: listing.address,
    rooms: listing.rooms ?? null,
    area: listing.area ?? null,
    ownerType: listing.ownerType ?? null,
    ownerName: listing.ownerName ?? null,
    features: listing.features,
    imageUrls: listing.imageUrls,
    sourceCreatedAt: listing.sourceCreatedAt?.toISOString() ?? null,
    sourceUpdatedAt: listing.sourceUpdatedAt?.toISOString() ?? null,
    sourcePriceChangeDate: listing.sourcePriceChangeDate?.toISOString() ?? null
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
