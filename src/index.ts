import express, { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { pool } from "./db";
import { reimbursementsRouter } from "./routes/reimbursements";
import cookieParser from "cookie-parser";
import { requireAuth } from "./auth";
import { authRouter } from "./routes/auth";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "error", db: "down" });
  }
});

app.use("/auth", authRouter);
app.use("/reimbursements", requireAuth, reimbursementsRouter);

// Translate database errors into HTTP responses. Log only the message,
// never the whole error object, since it can contain connection details.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { code?: string; message?: string; type?: string };

  if (e.type === "entity.parse.failed") {
    return res.status(400).json({ error: "malformed JSON body" });
  }
  if (e.code === "23505") {
    return res.status(409).json({ error: "duplicate: same email, date and type already exists" });
  }
  if (e.code === "23514") {
    return res.status(400).json({ error: "value violates a database rule" });
  }
  if (e.code === "22007" || e.code === "22008") {
    return res.status(400).json({ error: "invalid date" });
  }

  console.error("Unhandled error:", e.message);
  res.status(500).json({ error: "internal error" });
});

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
