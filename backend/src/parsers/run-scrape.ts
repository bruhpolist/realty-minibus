import { printRangeReminder, scrapeNow } from "./scrape.pipeline.js";

async function run(): Promise<void> {
  printRangeReminder();
  const listings = await scrapeNow();

  console.log(`[scrape] collected ${listings.length} listings in target range`);
  for (const listing of listings) {
    console.log(
      `[${listing.source}] ${listing.priceBYN} BYN (${listing.priceUSD} USD) | ${listing.address} | ${listing.url}`
    );
  }
}

run().catch((error) => {
  console.error("[scrape] fatal error", error);
  process.exitCode = 1;
});
