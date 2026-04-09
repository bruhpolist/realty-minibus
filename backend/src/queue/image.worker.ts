import { Worker } from "bullmq";
import Redis from "ioredis";
import { config } from "../config.js";
import { downloadImage, IMAGE_QUEUE_NAME, type ImageJobData } from "./image.queue.js";

const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

export const imageWorker = new Worker<ImageJobData, string>(
  IMAGE_QUEUE_NAME,
  async (job) => downloadImage(job.data),
  {
    connection: redis,
    concurrency: 8
  }
);

imageWorker.on("completed", (job, result) => {
  console.log(`[image-worker] completed ${job.id} -> ${result}`);
});

imageWorker.on("failed", (job, error) => {
  console.error(`[image-worker] failed ${job?.id}`, error.message);
});

console.log("[image-worker] started");
