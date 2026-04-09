export const FEATURES = [
  "балкон",
  "интернет",
  "wifi",
  "мебель",
  "ремонт",
  "охрана",
  "паркинг"
] as const;

export type FeatureTag = (typeof FEATURES)[number];

export type ScrapedDraftListing = {
  source: string;
  externalId?: string;
  url: string;
  title?: string;
  priceText: string;
  address: string;
  rooms?: number;
  area?: number;
  ownerType?: "owner" | "agency";
  ownerName?: string;
  description: string;
  imageUrls: string[];
  sourceCreatedAt?: string;
  sourceUpdatedAt?: string;
  sourcePriceChangeDate?: string;
};

export type NormalizedListing = {
  source: string;
  externalId?: string;
  url: string;
  title?: string;
  priceBYN: number;
  priceUSD: number;
  address: string;
  rooms?: number;
  area?: number;
  ownerType?: "owner" | "agency";
  ownerName?: string;
  description: string;
  features: FeatureTag[];
  imageUrls: string[];
  sourceCreatedAt?: Date;
  sourceUpdatedAt?: Date;
  sourcePriceChangeDate?: Date;
};

export interface SourceParser {
  readonly source: string;
  scrape(): Promise<ScrapedDraftListing[]>;
}
