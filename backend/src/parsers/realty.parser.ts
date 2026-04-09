import { config } from "../config.js";
import { allImageUrls, createPage, gotoWithRetry, safeText, withBrowser } from "./playwright.utils.js";
import type { ScrapedDraftListing, SourceParser } from "./types.js";
import { parseArea, parseRooms, toAbsoluteUrl, uniq } from "./utils.js";

const BASE_URL = "https://realty.by";
const SEARCH_URL = "https://realty.by/arenda/kvartiry/minsk/";

export class RealtyParser implements SourceParser {
  public readonly source = "realty.by";

  public async scrape(): Promise<ScrapedDraftListing[]> {
    return withBrowser(async (browser) => {
      const indexPage = await createPage(browser);
      await gotoWithRetry(indexPage, SEARCH_URL);

      const links = await indexPage.$$eval("a[href]", (anchors) => {
        return anchors
          .map((a) => a.getAttribute("href") ?? "")
          .filter((href) => /arenda\/kvartiry\/.+/i.test(href));
      });

      const targetLinks = uniq(links)
        .map((href) => toAbsoluteUrl(href, BASE_URL))
        .filter((href) => href.includes("/arenda/kvartiry/"))
        .slice(0, config.SCRAPE_LIMIT_PER_SOURCE);

      const results: ScrapedDraftListing[] = [];
      for (const link of targetLinks) {
        const itemPage = await createPage(browser);
        try {
          await gotoWithRetry(itemPage, link);

          const title = await safeText(itemPage, ["h1", '[class*="title"]']);
          const priceText = await safeText(itemPage, [
            '[class*="price"]',
            '[class*="cost"]',
            '[data-testid*="price"]'
          ]);
          const address = await safeText(itemPage, [
            '[class*="address"]',
            '[class*="location"]',
            '[data-testid*="address"]'
          ]);
          const description = await safeText(itemPage, [
            '[class*="description"]',
            '[class*="text"]',
            "article"
          ]);

          const metaText = await itemPage.locator("body").innerText().catch(() => "");
          const rooms = parseRooms(`${title} ${metaText}`);
          const area = parseArea(`${title} ${metaText}`);
          const imageUrls = (await allImageUrls(itemPage))
            .filter((url) => /https?:\/\//i.test(url))
            .map((url) => toAbsoluteUrl(url, BASE_URL))
            .filter((url) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url));

          if (!priceText || !address) {
            continue;
          }

          results.push({
            source: this.source,
            url: link,
            title,
            priceText,
            address,
            rooms,
            area,
            description,
            imageUrls: uniq(imageUrls)
          });
        } catch (error) {
          console.warn(`[${this.source}] failed listing parse`, link, error);
        } finally {
          await itemPage.context().close();
        }
      }

      await indexPage.context().close();
      return results;
    });
  }
}
