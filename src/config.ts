import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
});

// Parse once at startup. If a variable is missing or malformed,
// the process throws here instead of failing on the first request.
export const config = envSchema.parse(process.env);
