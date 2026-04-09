import axios from "axios";
import { config, TG_CHANNELS } from "../config.js";
import type { ScrapedDraftListing, SourceParser } from "./types.js";
import { parseArea, parseRooms, uniq } from "./utils.js";

type TgPost = {
  channel: string;
  url: string;
  text: string;
  images: string[];
};

function extractPosts(html: string, channel: string): TgPost[] {
  const postBlocks = html.match(/<div class="tgme_widget_message_wrap[^]*?<\/div>\s*<\/div>/g) ?? [];

  return postBlocks.map((block) => {
    const id = block.match(/data-post="([^"]+)"/)?.[1] ?? "";
    const text = (block.match(/<div class="tgme_widget_message_text[^>]*>([^]*?)<\/div>/)?.[1] ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const styleImages = [...block.matchAll(/background-image:url\('([^']+)'\)/g)].map((m) => m[1]);
    const tagImages = [...block.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    const images = uniq([...styleImages, ...tagImages]);

    const url = id ? `https://t.me/${id}` : `https://t.me/s/${channel}`;

    return { channel, url, text, images };
  });
}

function parsePriceText(text: string): string | null {
  const match =
    text.match(/(\d{2,4})\s*(?:usd|у\.?е\.?|\$)/i) ??
    text.match(/(\d{3,5})\s*(?:byn|руб|brn|br)/i);
  return match ? match[0] : null;
}

function parseAddress(text: string): string {
  const match = text.match(/минск[^,.!?;\n]*/i);
  return match ? match[0].trim() : "Минск";
}

export class TgChannelsParser implements SourceParser {
  public readonly source = "telegram";

  public async scrape(): Promise<ScrapedDraftListing[]> {
    if (TG_CHANNELS.length === 0) {
      return [];
    }

    const results: ScrapedDraftListing[] = [];

    for (const channel of TG_CHANNELS.slice(0, config.SCRAPE_LIMIT_PER_SOURCE)) {
      try {
        const response = await axios.get<string>(`https://t.me/s/${channel}`, {
          timeout: 30_000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
          }
        });

        const posts = extractPosts(response.data, channel);
        for (const post of posts.slice(0, 30)) {
          const priceText = parsePriceText(post.text);
          if (!priceText) {
            continue;
          }

          const lower = post.text.toLowerCase();
          const isFlat =
            lower.includes("квар") || lower.includes("студия") || lower.includes("комнат");
          if (!isFlat) {
            continue;
          }

          results.push({
            source: this.source,
            url: post.url,
            title: `@${channel}`,
            priceText,
            address: parseAddress(post.text),
            rooms: parseRooms(post.text),
            area: parseArea(post.text),
            description: post.text,
            imageUrls: post.images
          });
        }
      } catch (error) {
        console.warn(`[telegram] channel parse failed @${channel}`, error);
      }
    }

    const byUrl = new Map<string, ScrapedDraftListing>();
    for (const item of results) {
      byUrl.set(item.url, item);
    }
    return [...byUrl.values()];
  }
}
