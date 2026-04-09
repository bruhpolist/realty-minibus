import path from "node:path";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import type { Prisma } from "@prisma/client";
import { Server } from "socket.io";
import { config, FRONTEND_ORIGINS, PRICE_RANGE_BYN, USD_PRICE_RANGE } from "./config.js";
import { prisma } from "./db/prisma.js";
import { geocodeAddress } from "./services/geocode.js";
import { pruneOldListings } from "./services/listing-retention.js";
import { runSync } from "./services/listing-sync.js";
import { initTelegramBot, notifyNewListings } from "./telegram-bot.js";

const app = express();

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) {
    return true;
  }
  return FRONTEND_ORIGINS.includes(origin);
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    }
  }
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    }
  })
);
app.use(express.json());

app.use("/images", express.static(path.resolve(process.cwd(), config.IMAGES_DIR)));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    range: PRICE_RANGE_BYN,
    usdRange: USD_PRICE_RANGE
  });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true
    });
  } catch (error) {
    res.status(503).json({
      ok: false
    });
  }
});

app.get("/api/listings", async (req, res) => {
  const district = String(req.query.district ?? "").trim();
  const roomsQuery = String(req.query.rooms ?? "").trim();
  const tagsQuery = String(req.query.tags ?? "").trim();
  const pageRaw = Number(req.query.page ?? 1);
  const pageSizeRaw = Number(req.query.pageSize ?? 20);
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(100, Math.max(1, Math.floor(pageSizeRaw))) : 20;

  const rooms = roomsQuery
    ? roomsQuery
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v))
    : [];
  const tags = tagsQuery
    ? tagsQuery
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const where: Prisma.ListingWhereInput = {
    priceBYN: {
      gte: PRICE_RANGE_BYN.min,
      lte: PRICE_RANGE_BYN.max
    }
  };

  if (district) {
    where.address = {
      contains: district,
      mode: "insensitive"
    };
  }

  if (rooms.length > 0) {
    where.rooms = { in: rooms };
  }

  if (tags.length > 0) {
    where.features = { hasEvery: tags };
  }

  const total = await prisma.listing.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize
  });

  res.json({
    items: listings,
    total,
    page: safePage,
    pageSize,
    totalPages
  });
});

app.get("/api/geocode", async (req, res) => {
  const address = String(req.query.address ?? "").trim();
  if (!address) {
    res.status(400).json({ error: "address is required" });
    return;
  }

  try {
    const point = await geocodeAddress(address);
    if (!point) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(point);
  } catch (error) {
    console.error("[geocode] failed", error);
    res.status(500).json({ error: "geocode failed" });
  }
});

let syncInProgress = false;

async function scrapeAndBroadcast(reason: "startup" | "poll"): Promise<void> {
  if (syncInProgress) {
    console.log(`[sync] skipped (${reason}) previous run still in progress`);
    return;
  }

  syncInProgress = true;
  console.log(`[sync] starting (${reason})`);
  try {
    const result = await runSync();

    if (result.created.length > 0) {
      io.emit("listing:new", result.created);
      await notifyNewListings(result.created);
    }

    const pruned = await pruneOldListings(config.MAX_LISTINGS);
    if (pruned > 0) {
      console.log(`[retention] pruned ${pruned} oldest listings (limit=${config.MAX_LISTINGS})`);
    }

    console.log(
      `[sync] done (${reason}) created=${result.created.length} updated=${result.updated.length} skipped=${result.skipped}`
    );
  } finally {
    syncInProgress = false;
  }
}

async function bootstrap(): Promise<void> {
  initTelegramBot();

  httpServer.listen(config.PORT, () => {
    console.log(
      `Backend running on :${config.PORT}. BYN range ${PRICE_RANGE_BYN.min}-${PRICE_RANGE_BYN.max}, USD ${USD_PRICE_RANGE.min}-${USD_PRICE_RANGE.max}.`
    );

    scrapeAndBroadcast("startup").catch((error) => {
      console.error("[sync] startup failed", error);
    });

    setInterval(() => {
      scrapeAndBroadcast("poll").catch((error) => {
        console.error("[sync] poll failed", error);
      });
    }, config.POLL_INTERVAL_MS);
  });
}

bootstrap().catch((error) => {
  console.error("[server] fatal", error);
  process.exitCode = 1;
});
