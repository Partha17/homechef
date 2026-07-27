import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default("postgres://homechef:homechef_dev@localhost:5432/homechef"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().default("dev-secret-change-in-prod"),
});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[Config] Invalid environment variables:", parsed.error.flatten());
    process.exit(1);
  }
  return parsed.data;
}

export const config = loadConfig();