import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import { Queue, type JobsOptions } from "bullmq";
import Redis from "ioredis";
import sharp from "sharp";
import { config } from "../config.js";

export const IMAGE_QUEUE_NAME = "listing-images";

const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

export const imageQueue = new Queue<ImageJobData, string>(IMAGE_QUEUE_NAME, {
  connection: redis
});

export type ImageJobData = {
  source: string;
  listingUrl: string;
  imageUrl: string;
  index: number;
};

export async function ensureImagesDir(): Promise<string> {
  const outputDir = path.resolve(process.cwd(), config.IMAGES_DIR);
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

export function imageFileName(job: ImageJobData): string {
  const urlHash = crypto.createHash("sha1").update(job.listingUrl).digest("hex").slice(0, 12);
  const ext = path.extname(job.imageUrl).replace(".", "").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  return `${job.source}-${urlHash}-${job.index}.${safeExt}`;
}

export async function downloadImage(job: ImageJobData): Promise<string> {
  const outputDir = await ensureImagesDir();
  const fileName = imageFileName(job);
  const absolutePath = path.join(outputDir, fileName);

  const existing = await fs
    .access(absolutePath)
    .then(() => true)
    .catch(() => false);
  if (existing) {
    return `/images/${fileName}`;
  }

  const response = await axios.get<ArrayBuffer>(job.imageUrl, {
    responseType: "arraybuffer",
    timeout: 30_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    }
  });

  const inputBuffer = Buffer.from(response.data);
  const isJpeg = /\.(jpe?g)(\?|$)/i.test(job.imageUrl);

  if (isJpeg) {
    await sharp(inputBuffer).jpeg({ quality: 88 }).toFile(absolutePath);
  } else {
    await fs.writeFile(absolutePath, inputBuffer);
  }

  return `/images/${fileName}`;
}

export async function enqueueListingImages(
  source: string,
  listingUrl: string,
  imageUrls: string[],
  options?: JobsOptions
): Promise<string[]> {
  const outputDir = await ensureImagesDir();

  await imageQueue.addBulk(
    imageUrls.map((imageUrl, index) => ({
      name: "download",
      data: {
        source,
        listingUrl,
        imageUrl,
        index
      },
      opts: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1_000
        },
        ...options
      }
    }))
  );

  const paths = await Promise.all(
    imageUrls.map(async (imageUrl, index) => {
      const fileName = imageFileName({
        source,
        listingUrl,
        imageUrl,
        index
      });
      const localPath = path.join(outputDir, fileName);
      const exists = await fs
        .access(localPath)
        .then(() => true)
        .catch(() => false);

      return exists ? `/images/${fileName}` : imageUrl;
    })
  );

  return paths;
}
