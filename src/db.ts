import { Pool } from "pg";
import { config } from "./config";

// A pool keeps a set of reusable connections. Opening a new connection
// for every request is slow and can exhaust Postgres's connection limit.
export const pool = new Pool({ connectionString: config.DATABASE_URL });

// An idle client can drop its connection, for example when Docker restarts.
// Without this listener, that error would crash the process.
pool.on("error", (err) => {
  console.error("Unexpected database error on an idle client:", err.message);
});
