import { listingsResponseSchema, type ListingFilters, type ListingsResponse } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type FetchListingsInput = {
  filters: ListingFilters;
  page: number;
  pageSize?: number;
};

function qs({ filters, page, pageSize = 20 }: FetchListingsInput): string {
  const params = new URLSearchParams();
  if (filters.district) {
    params.set("district", filters.district);
  }
  if (filters.rooms.length > 0) {
    params.set("rooms", filters.rooms.join(","));
  }
  if (filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }
  params.set("page", String(Math.max(1, page)));
  params.set("pageSize", String(Math.max(1, pageSize)));
  return params.toString();
}

export async function fetchListings(input: FetchListingsInput): Promise<ListingsResponse> {
  const response = await fetch(`${API_URL}/api/listings?${qs(input)}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const json = await response.json();
  return listingsResponseSchema.parse(json);
}
