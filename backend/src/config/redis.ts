import Redis from "ioredis";

let redisInstance: Redis | null = null;

export function createRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
    });

    redisInstance.on("error", (err) => {
      console.warn("[Redis] Error:", err.message);
    });
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}