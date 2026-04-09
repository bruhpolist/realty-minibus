import type { Listing } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { scrapeNow } from "../parsers/scrape.pipeline.js";
import { listingHash } from "../parsers/utils.js";

export type SyncResult = {
  created: Listing[];
  updated: Listing[];
  skipped: number;
};

export async function runSync(): Promise<SyncResult> {
  const scraped = await scrapeNow();
  const created: Listing[] = [];
  const updated: Listing[] = [];
  let skipped = 0;

  for (const item of scraped) {
    const hash = listingHash(item);
    const existing = item.externalId
      ? await prisma.listing.findFirst({
          where: {
            source: item.source,
            externalId: item.externalId
          }
        })
      : await prisma.listing.findUnique({ where: { url: item.url } });

    if (!existing) {
      const inserted = await prisma.listing.create({
        data: {
          source: item.source,
          externalId: item.externalId ?? item.url.split("/").filter(Boolean).at(-1),
          url: item.url,
          priceBYN: item.priceBYN,
          priceUSD: item.priceUSD,
          address: item.address,
          rooms: item.rooms,
          area: item.area,
          ownerType: item.ownerType,
          ownerName: item.ownerName,
          features: item.features,
          images: item.imageUrls,
          sourceCreatedAt: item.sourceCreatedAt,
          sourceUpdatedAt: item.sourceUpdatedAt,
          sourcePriceChangeDate: item.sourcePriceChangeDate,
          hash
        }
      });
      created.push(inserted);
      continue;
    }

    if (existing.hash === hash) {
      skipped += 1;
      continue;
    }

    const patched = await prisma.listing.update({
      where: { id: existing.id },
      data: {
        priceBYN: item.priceBYN,
        priceUSD: item.priceUSD,
        externalId: item.externalId ?? existing.externalId,
        url: item.url,
        address: item.address,
        rooms: item.rooms,
        area: item.area,
        ownerType: item.ownerType,
        ownerName: item.ownerName,
        features: item.features,
        images: item.imageUrls,
        sourceCreatedAt: item.sourceCreatedAt,
        sourceUpdatedAt: item.sourceUpdatedAt,
        sourcePriceChangeDate: item.sourcePriceChangeDate,
        hash
      }
    });

    updated.push(patched);
  }

  return { created, updated, skipped };
}
