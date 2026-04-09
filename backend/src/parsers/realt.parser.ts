import axios from "axios";
import { config } from "../config.js";
import type { ScrapedDraftListing, SourceParser } from "./types.js";
import { uniq } from "./utils.js";

const REALT_URL = "https://realt.by/bff/graphql";
const PRICE_CURRENCY_USD = 840;
const PRICE_CURRENCY_BYN = 933;

const SEARCH_QUERY = `query searchObjects($data: GetObjectsByAddressInput!) {
  searchObjects(data: $data) {
    body {
      results {
        uuid
        code
        title
        description
        headline
        createdAt
        updatedAt
        agencyName
        companyName
        contactName
        agencyUuid
        price
        priceCurrency
        priceChangeDate
        rooms
        images
        areaTotal
        address
        location
        furniture
        balconyType
        repairState
        hasVideo
      }
      pagination {
        page
        pageSize
        totalCount
      }
    }
    success
    errors {
      code
      message
    }
  }
}`;

type RealtObject = {
  uuid?: string;
  code?: number | string | null;
  title?: string | null;
  description?: string | null;
  headline?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  agencyName?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  agencyUuid?: string | null;
  price?: number | null;
  priceCurrency?: number | null;
  priceChangeDate?: string | null;
  rooms?: number | null;
  images?: string[];
  areaTotal?: number | null;
  address?: string | null;
  furniture?: number | null;
  balconyType?: number | null;
  repairState?: number | null;
  hasVideo?: boolean | null;
};

type RealtResponse = Array<{
  data?: {
    searchObjects?: {
      body?: {
        results?: RealtObject[];
        pagination?: {
          page?: number;
          pageSize?: number;
          totalCount?: number;
        };
      };
      success?: boolean;
    };
  };
}>;

function requestBody(page: number): unknown {
  return [
    {
      operationName: "searchObjects",
      variables: {
        data: {
          where: {
            priceTo: "450",
            priceType: "840",
            addressV2: [{ townUuid: "4cb07174-7b00-11eb-8943-0cc47adabd66" }],
            category: 2
          },
          pagination: {
            page,
            pageSize: 30
          },
          sort: [
            { by: "paymentStatus", order: "DESC" },
            { by: "priority", order: "DESC" },
            { by: "raiseDate", order: "DESC" },
            { by: "updatedAt", order: "DESC" }
          ],
          extraFields: null,
          isReactAdaptiveUA: false
        }
      },
      query: SEARCH_QUERY
    }
  ];
}

function toPriceText(item: RealtObject): string | null {
  if (!item.price || !item.priceCurrency) {
    return null;
  }
  if (item.priceCurrency === PRICE_CURRENCY_USD) {
    return `${item.price} USD`;
  }
  if (item.priceCurrency === PRICE_CURRENCY_BYN) {
    return `${item.price} BYN`;
  }
  return `${item.price} BYN`;
}

function toDescription(item: RealtObject): string {
  const flags = [
    item.furniture ? "мебель" : "",
    item.balconyType ? "балкон" : "",
    item.repairState ? "ремонт" : "",
    item.hasVideo ? "видео" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return [item.headline ?? "", item.description ?? "", flags].filter(Boolean).join(" ").trim();
}

export class RealtParser implements SourceParser {
  public readonly source = "realt.by";

  public async scrape(): Promise<ScrapedDraftListing[]> {
    const maxPages = Math.max(1, Math.min(5, Math.ceil(config.SCRAPE_LIMIT_PER_SOURCE / 30)));
    const results: ScrapedDraftListing[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
      const response = await axios.post<RealtResponse>(REALT_URL, requestBody(page), {
        timeout: 30_000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        }
      });

      const payload = response.data?.[0]?.data?.searchObjects;
      const pageItems = payload?.body?.results ?? [];
      if (!payload?.success || pageItems.length === 0) {
        break;
      }

      for (const item of pageItems) {
        const code = String(item.code ?? "").trim();
        const priceText = toPriceText(item);
        if (!code || !priceText) {
          continue;
        }

        const url = `https://realt.by/rent-flat-for-long/object/${code}`;
        results.push({
          source: this.source,
          externalId: code,
          url,
          title: item.title ?? item.headline ?? `Realt ${code}`,
          priceText,
          address: item.address?.trim() || "Минск",
          rooms: item.rooms ?? undefined,
          area: item.areaTotal ?? undefined,
          ownerType: item.agencyName || item.companyName || item.agencyUuid ? "agency" : "owner",
          ownerName: item.agencyName ?? item.companyName ?? item.contactName ?? undefined,
          description: toDescription(item),
          imageUrls: uniq(item.images ?? []),
          sourceCreatedAt: item.createdAt ?? undefined,
          sourceUpdatedAt: item.updatedAt ?? undefined,
          sourcePriceChangeDate: item.priceChangeDate ?? undefined
        });
      }
    }

    return results;
  }
}
