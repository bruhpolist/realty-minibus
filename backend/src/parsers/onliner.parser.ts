import axios from "axios";
import { config } from "../config.js";
import type { ScrapedDraftListing, SourceParser } from "./types.js";

const ONLINER_ENDPOINT =
  "https://r.onliner.by/sdapi/ak.api/search/apartments?currency=USD&price%5Bmin%5D=300&price%5Bmax%5D=460&bounds%5Blb%5D%5Blat%5D=53.68654187329758&bounds%5Blb%5D%5Blong%5D=27.30583190917969&bounds%5Brt%5D%5Blat%5D=54.10893027534094&bounds%5Brt%5D%5Blong%5D=27.817382812500004&page=1&v=0.5633170780087582";

type OnlinerApartment = {
  id?: number;
  url?: string;
  photo?: string;
  created_at?: string;
  last_time_up?: string;
  contact?: {
    owner?: boolean;
  };
  rent_type?: string;
  location?: {
    address?: string;
    user_address?: string;
    latitude?: number;
    longitude?: number;
  };
  price?: {
    amount?: string;
    currency?: string;
    converted?: {
      BYN?: { amount?: string };
      USD?: { amount?: string };
    };
  };
};

type OnlinerResponse = {
  apartments?: OnlinerApartment[];
};

function toNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseRooms(rentType?: string): number | undefined {
  if (!rentType) {
    return undefined;
  }
  const match = rentType.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function toPriceText(item: OnlinerApartment): string | null {
  const currency = item.price?.currency;
  const amount = toNumber(item.price?.amount);
  if (currency && amount) {
    return `${amount} ${currency}`;
  }

  const usd = toNumber(item.price?.converted?.USD?.amount);
  if (usd) {
    return `${usd} USD`;
  }

  const byn = toNumber(item.price?.converted?.BYN?.amount);
  if (byn) {
    return `${byn} BYN`;
  }

  return null;
}

function normalizeImageUrl(value?: string): string | null {
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  return `https://${value.replace(/^\/+/, "")}`;
}

export class OnlinerParser implements SourceParser {
  public readonly source = "onliner.by";

  public async scrape(): Promise<ScrapedDraftListing[]> {
    const pages = Math.max(1, Math.min(4, Math.ceil(config.SCRAPE_LIMIT_PER_SOURCE / 36)));
    const results: ScrapedDraftListing[] = [];

    for (let page = 1; page <= pages; page += 1) {
      const url = ONLINER_ENDPOINT.replace("page=1", `page=${page}`);
      const response = await axios.get<OnlinerResponse>(url, {
        timeout: 30_000,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        }
      });

      const apartments = response.data.apartments ?? [];
      if (apartments.length === 0) {
        break;
      }

      for (const item of apartments) {
        const listingUrl = item.url?.trim();
        const priceText = toPriceText(item);
        if (!listingUrl || !priceText) {
          continue;
        }

        const address = item.location?.user_address || item.location?.address || "Минск";
        const rooms = parseRooms(item.rent_type);
        const photoUrl = normalizeImageUrl(item.photo);
        const description = [
          address,
          item.location?.latitude ? `lat:${item.location.latitude}` : "",
          item.location?.longitude ? `lng:${item.location.longitude}` : ""
        ]
          .filter(Boolean)
          .join(" ");

        results.push({
          source: this.source,
          externalId: item.id ? String(item.id) : undefined,
          url: listingUrl,
          title: `Onliner #${item.id ?? "apartment"}`,
          priceText,
          address,
          rooms,
          area: undefined,
          ownerType: item.contact?.owner === true ? "owner" : item.contact?.owner === false ? "agency" : undefined,
          description,
          imageUrls: photoUrl ? [photoUrl] : [],
          sourceCreatedAt: item.created_at ?? undefined,
          sourceUpdatedAt: item.last_time_up ?? undefined,
          sourcePriceChangeDate: item.last_time_up ?? undefined
        });
      }
    }

    return results;
  }
}
