import type { Listing } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { Input, Telegraf } from "telegraf";
import { config } from "./config.js";
import { prisma } from "./db/prisma.js";

let bot: Telegraf | null = null;

export function initTelegramBot(): Telegraf | null {
  if (!config.BOT_TOKEN) {
    console.warn("[telegram] BOT_TOKEN is not set, bot disabled");
    return null;
  }

  console.log(`[telegram] BOT_TOKEN detected (len=${config.BOT_TOKEN.length})`);

  if (bot) {
    return bot;
  }

  bot = new Telegraf(config.BOT_TOKEN);

  bot.start(async (ctx) => {
    const chatId = String(ctx.chat.id);
    await prisma.subscriber.upsert({
      where: { chatId },
      update: {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        isActive: true
      },
      create: {
        chatId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        isActive: true
      }
    });

    await ctx.reply(
      "Subscription enabled. You will receive new Minsk rentals in 300-450 USD range (990-1485 BYN)."
    );
  });

  console.log("[telegram] launching bot (long polling)...");

  bot
    .launch({
      dropPendingUpdates: false
    })
    .then(() => console.log("[telegram] bot started"))
    .catch((error) => console.error("[telegram] launch failed", error));

  process.once("SIGINT", () => bot?.stop("SIGINT"));
  process.once("SIGTERM", () => bot?.stop("SIGTERM"));

  return bot;
}

function listingCaption(listing: Listing): string {
  const roomText = listing.rooms ? `${listing.rooms}к` : "комнаты: н/д";
  const areaText = listing.area ? `${listing.area} м²` : "площадь: н/д";
  const features = listing.features.length ? `теги: ${listing.features.join(", ")}` : "теги: нет";
  const postedAt = formatDateTime(listing.sourceCreatedAt ?? listing.createdAt);
  const priceChangedAt = listing.sourcePriceChangeDate ? formatDateTime(listing.sourcePriceChangeDate) : null;
  const ownerText = listing.ownerType === "agency"
    ? `владелец: агентство${listing.ownerName ? ` (${listing.ownerName})` : ""}`
    : listing.ownerType === "owner"
      ? `владелец: собственник${listing.ownerName ? ` (${listing.ownerName})` : ""}`
      : listing.ownerName
        ? `владелец: ${listing.ownerName}`
        : "владелец: н/д";

  return [
    `${listing.priceBYN.toFixed(0)} BYN (${listing.priceUSD.toFixed(0)} USD)`,
    listing.address,
    `${roomText}, ${areaText}`,
    `источник: ${listing.source}`,
    ownerText,
    `опубликовано: ${postedAt}`,
    priceChangedAt ? `изменение цены: ${priceChangedAt}` : "",
    features,
    listing.url
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

async function resolveLocalPhoto(relativeImagePath: string): Promise<string | null> {
  if (!relativeImagePath.startsWith("/images/")) {
    return null;
  }

  const fileName = relativeImagePath.replace("/images/", "");
  const absolutePath = path.resolve(process.cwd(), config.IMAGES_DIR, fileName);
  const exists = await fs
    .access(absolutePath)
    .then(() => true)
    .catch(() => false);

  return exists ? absolutePath : null;
}

async function sendListing(subscriberChatId: string, listing: Listing): Promise<void> {
  const firstPhoto = listing.images[0];
  if (!firstPhoto) {
    await bot?.telegram.sendMessage(subscriberChatId, listingCaption(listing));
    return;
  }

  const localPath = await resolveLocalPhoto(firstPhoto);
  if (localPath) {
    await bot?.telegram.sendPhoto(subscriberChatId, Input.fromLocalFile(localPath), {
      caption: listingCaption(listing)
    });
    return;
  }

  if (/^https?:\/\//i.test(firstPhoto)) {
    await bot?.telegram.sendPhoto(subscriberChatId, firstPhoto, {
      caption: listingCaption(listing)
    });
    return;
  }

  await bot?.telegram.sendMessage(subscriberChatId, listingCaption(listing));
}

export async function notifyNewListings(listings: Listing[]): Promise<void> {
  if (!bot || listings.length === 0) {
    return;
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { isActive: true }
  });

  for (const listing of listings) {
    for (const subscriber of subscribers) {
      try {
        await sendListing(subscriber.chatId, listing);
      } catch (error) {
        console.error(`[telegram] send failed for chat ${subscriber.chatId}`, error);
      }
    }
  }
}
