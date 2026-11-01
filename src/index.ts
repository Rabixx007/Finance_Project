import express from "express";
import { config } from "./config";
import { pool } from "./db";

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  }    catch (err) {
    console.error("Health check failed:", (err as Error).message);
    res.status(503).json({ status: "error", db: "down" });
  }
});

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
