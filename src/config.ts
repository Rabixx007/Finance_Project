import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
});

// Parse once at startup. A missing or weak secret stops the server immediately.
export const config = envSchema.parse(process.env);
