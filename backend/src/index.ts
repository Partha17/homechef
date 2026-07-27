import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { apiRouter } from "./api/routes";
import { telegramWebhookRouter } from "./telegram/webhook";
import { setupBullMQ } from "./jobs/setup";
import { createRedisClient } from "./config/redis";

const app = express();
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT || "3000", 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", apiRouter);
app.use("/api/telegram", telegramWebhookRouter);

async function main() {
  // Verify Redis connection
  const redis = createRedisClient();
  try {
    await redis.ping();
    console.log("[Redis] Connected");
  } catch (err) {
    console.warn("[Redis] Connection failed, running without cache:", err);
  }

  // Setup BullMQ queues and workers
  await setupBullMQ();

  httpServer.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  });
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});