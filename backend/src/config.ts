import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const envCandidates = [
  process.env.DOTENV_CONFIG_PATH ? path.resolve(process.env.DOTENV_CONFIG_PATH) : "",
  process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD, ".env") : "",
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(__dirname, "../../.env")
].filter(Boolean);

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

const optionalUrlFromEnv = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().url().optional());

const optionalStringFromEnv = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
  USD_RATE: z.coerce.number().positive().default(3.3),
  PRICE_MIN: z.coerce.number().min(0).default(990),
  PRICE_MAX: z.coerce.number().min(0).default(1485),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  IMAGES_DIR: z.string().default("../public/images"),
  SCRAPE_LIMIT_PER_SOURCE: z.coerce.number().int().positive().default(35),
  MAX_LISTINGS: z.coerce.number().int().positive().default(2000),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
  SCRAPE_CRON: z.string().default("*/10 * * * *"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  FRONTEND_ORIGINS: z.string().default(""),
  TG_CHANNELS: z.string().default(""),
  BOT_TOKEN: optionalStringFromEnv,
  TELEGRAM_WEBHOOK_URL: optionalUrlFromEnv
}).refine((v) => v.PRICE_MAX > v.PRICE_MIN, {
  message: "PRICE_MAX must be greater than PRICE_MIN",
  path: ["PRICE_MAX"]
});

export type AppConfig = z.infer<typeof envSchema>;

export const config: AppConfig = envSchema.parse(process.env);

export const PRICE_RANGE_BYN = {
  min: config.PRICE_MIN,
  max: config.PRICE_MAX
};

export const USD_PRICE_RANGE = {
  min: Math.round((config.PRICE_MIN / config.USD_RATE) * 100) / 100,
  max: Math.round((config.PRICE_MAX / config.USD_RATE) * 100) / 100
};

export const TG_CHANNELS = config.TG_CHANNELS
  .split(",")
  .map((value) => value.trim().replace(/^@/, ""))
  .filter(Boolean);

export const FRONTEND_ORIGINS = [
  ...config.FRONTEND_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean),
  config.FRONTEND_ORIGIN
].filter((value, index, arr) => arr.indexOf(value) === index);
