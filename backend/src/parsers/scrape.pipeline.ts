import { config } from "../config.js";
import { enqueueListingImages } from "../queue/image.queue.js";
import { getUsdToBynRate } from "../services/currency-rate.js";
import { KufarParser } from "./kufar.parser.js";
import { OnlinerParser } from "./onliner.parser.js";
import { RealtParser } from "./realt.parser.js";
import type { NormalizedListing, SourceParser } from "./types.js";
import { normalizeDraftListing, uniq } from "./utils.js";

export async function scrapeNow(): Promise<NormalizedListing[]> {
  const usdRate = await getUsdToBynRate();
  const parsers: SourceParser[] = [new RealtParser(), new KufarParser(), new OnlinerParser()];
  const collected: NormalizedListing[] = [];

  for (const parser of parsers) {
    try {
      const drafts = await parser.scrape();
      for (const draft of drafts) {
        const normalized = normalizeDraftListing(draft, usdRate);
        if (!normalized) {
          continue;
        }

        normalized.imageUrls = uniq(normalized.imageUrls).slice(0, 30);
        if (normalized.imageUrls.length > 0) {
          normalized.imageUrls = await enqueueListingImages(
            normalized.source,
            normalized.url,
            normalized.imageUrls
          );
        }
        collected.push(normalized);
      }
    } catch (error) {
      console.error(`[scrapeNow] parser ${parser.source} failed`, error);
    }
  }

  return collected.sort((a, b) => b.priceBYN - a.priceBYN);
}

export function printRangeReminder(): void {
  console.log(
    `[scrape] PRICE RANGE: ${config.PRICE_MIN}-${config.PRICE_MAX} BYN (300-450 USD target)`
  );
}
