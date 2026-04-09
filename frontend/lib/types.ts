import { z } from "zod";

export const featureSchema = z.enum([
  "балкон",
  "интернет",
  "wifi",
  "мебель",
  "ремонт",
  "охрана",
  "паркинг"
]);

export const listingSchema = z.object({
  id: z.string(),
  source: z.string(),
  url: z.string().url(),
  priceBYN: z.number(),
  priceUSD: z.number(),
  address: z.string(),
  rooms: z.number().nullable().optional(),
  area: z.number().nullable().optional(),
  ownerType: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  features: z.array(z.string()),
  images: z.array(z.string()),
  hash: z.string(),
  createdAt: z.string(),
  sourceCreatedAt: z.string().nullable().optional(),
  sourceUpdatedAt: z.string().nullable().optional(),
  sourcePriceChangeDate: z.string().nullable().optional()
});

export const listingsResponseSchema = z.object({
  items: z.array(listingSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive()
});

export type Listing = z.infer<typeof listingSchema>;
export type ListingsResponse = z.infer<typeof listingsResponseSchema>;

export type ListingFilters = {
  district: string;
  rooms: number[];
  tags: string[];
};
