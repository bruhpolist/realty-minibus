import axios from "axios";
import type { ScrapedDraftListing, SourceParser } from "./types.js";
import { uniq } from "./utils.js";

const KUFAR_URL =
  "https://api.kufar.by/search-api/v2/search/rendered-paginated?cat=1010&cur=USD&gtsy=country-belarus~province-minsk~locality-minsk&lang=ru&prc=r%3A300%2C450&rms=v.or%3A2&size=30&typ=let";

type KufarParameter = {
  p?: string;
  v?: unknown;
  vl?: unknown;
};

type KufarImage = {
  path?: string;
};

type KufarAd = {
  ad_link?: string;
  ad_id?: number;
  subject?: string;
  list_time?: string;
  company_ad?: boolean;
  body?: string | null;
  body_short?: string;
  price_usd?: string;
  price_byn?: string;
  images?: KufarImage[];
  account_parameters?: KufarParameter[];
  ad_parameters?: KufarParameter[];
};

type KufarResponse = {
  ads?: KufarAd[];
};

function getParam(parameters: KufarParameter[] | undefined, key: string): KufarParameter | undefined {
  return parameters?.find((item) => item.p === key);
}

function toNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parsePriceText(ad: KufarAd): string | null {
  const usdRaw = toNumber(ad.price_usd);
  const bynRaw = toNumber(ad.price_byn);

  if (usdRaw) {
    const usd = usdRaw > 1000 ? usdRaw / 100 : usdRaw;
    return `${usd} USD`;
  }
  if (bynRaw) {
    const byn = bynRaw > 1000 ? bynRaw / 100 : bynRaw;
    return `${byn} BYN`;
  }
  return null;
}

function parseAddress(ad: KufarAd): string {
  const accountAddress = getParam(ad.account_parameters, "address")?.v;
  if (typeof accountAddress === "string" && accountAddress.trim()) {
    return accountAddress.trim();
  }
  return "Минск";
}

function parseRooms(ad: KufarAd): number | undefined {
  const rooms = getParam(ad.ad_parameters, "rooms")?.v;
  return toNumber(rooms);
}

function parseArea(ad: KufarAd): number | undefined {
  const area = getParam(ad.ad_parameters, "size")?.v;
  return toNumber(area);
}

function parseImages(ad: KufarAd): string[] {
  const direct =
    ad.images
      ?.map((img) => img.path)
      .filter((path): path is string => Boolean(path))
      .map((path) => `https://rms.kufar.by/v1/gallery/${path}`) ?? [];

  return uniq(direct);
}

function collectExtraText(ad: KufarAd): string {
  const parts: string[] = [];

  for (const param of ad.ad_parameters ?? []) {
    const value = param.vl ?? param.v;
    if (Array.isArray(value)) {
      parts.push(value.map((item) => String(item)).join(" "));
    } else if (value !== undefined && value !== null) {
      parts.push(String(value));
    }
  }

  return parts.join(" ");
}

export class KufarParser implements SourceParser {
  public readonly source = "kufar.by";

  public async scrape(): Promise<ScrapedDraftListing[]> {
    const response = await axios.get<KufarResponse>(KUFAR_URL, {
      timeout: 30_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "application/json"
      }
    });

    const ads = response.data.ads ?? [];
    const results: ScrapedDraftListing[] = [];

    for (const ad of ads) {
      const url = ad.ad_link?.trim();
      const priceText = parsePriceText(ad);
      if (!url || !priceText) {
        continue;
      }

      const description = [ad.body ?? "", ad.body_short ?? "", collectExtraText(ad)]
        .filter(Boolean)
        .join(" ")
        .trim();

      results.push({
        source: this.source,
        externalId: ad.ad_id ? String(ad.ad_id) : undefined,
        url,
        title: ad.subject ?? `Kufar #${ad.ad_id ?? "listing"}`,
        priceText,
        address: parseAddress(ad),
        rooms: parseRooms(ad),
        area: parseArea(ad),
        ownerType: ad.company_ad ? "agency" : "owner",
        description,
        imageUrls: parseImages(ad),
        sourceCreatedAt: ad.list_time ?? undefined
      });
    }

    return results;
  }
}
