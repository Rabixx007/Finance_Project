import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { reimbursementInput } from "../schemas/reimbursement";
import * as repo from "../repository/reimbursements";
import { sendReimbursementMail } from "../mailer";

export const actionsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const MAX_ROWS = 1000;
const REQUIRED_HEADERS = [
  "email",
  "name",
  "college_id",
  "reimbursement_type",
  "claimed_amount",
  "amount_received",
  "reimbursed_on",
];

// One send run at a time, so a double click can't mail the same record twice.
let sendInProgress = false;

// ---------- Import ----------

actionsRouter.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "attach a CSV in the 'file' field" });
  }

  let records: Record<string, string>[];
  try {
    records = parse(req.file.buffer, {
      columns: true,
      bom: true,
      trim: true,
      skip_empty_lines: true,
    });
  } catch (err) {
    return res.status(400).json({ error: "could not read CSV", detail: (err as Error).message });
  }

  if (records.length === 0) {
    return res.status(400).json({ error: "the file has no data rows" });
  }
  if (records.length > MAX_ROWS) {
    return res.status(400).json({ error: `at most ${MAX_ROWS} rows per upload` });
  }

  const headers = Object.keys(records[0]);
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return res.status(400).json({ error: "missing columns", missing });
  }

  let inserted = 0;
  const duplicates: { row: number; reason: string }[] = [];
  const invalid: { row: number; errors: Record<string, string[] | undefined> }[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = i + 2; // line 1 of the file is the header
    const raw = records[i];

    const parsed = reimbursementInput.safeParse({
      ...raw,
      comment: raw.comment || undefined, // empty cell means no comment
    });
    if (!parsed.success) {
      invalid.push({ row, errors: parsed.error.flatten().fieldErrors });
      continue;
    }

    const added = await repo.insertIfNew(parsed.data);
    if (added) inserted++;
    else duplicates.push({ row, reason: "same email, date and type already exists" });
  }

  res.json({ inserted, duplicates, invalid });
});

// ---------- Send ----------

// Returns null on success, or a short reason on failure.
async function sendById(id: number): Promise<string | null> {
  const row = await repo.getReimbursement(id);
  if (!row) return "not found";
  if (row.mail_status === "sent") return "already sent";

  try {
    await sendReimbursementMail(row);
  } catch (err) {
    await repo.markMail(id, "failed");
    return (err as Error).message;
  }

  await repo.markMail(id, "sent");
  return null;
}

actionsRouter.post("/send-all", async (_req, res) => {
  if (sendInProgress) {
    return res.status(409).json({ error: "a send is already running" });
  }
  sendInProgress = true;
  try {
    const ids = await repo.listUnsentIds();
    let sent = 0;
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      const error = await sendById(Number(id));
      if (error === null) sent++;
      else failed.push({ id, error });
    }

    res.json({ sent, failed });
  } finally {
    sendInProgress = false;
  }
});

actionsRouter.post("/:id/send", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "invalid id" });
  }
  if (sendInProgress) {
    return res.status(409).json({ error: "a send is already running" });
  }

  sendInProgress = true;
  try {
    const error = await sendById(id);
    if (error === "not found") return res.status(404).json({ error: "not found" });
    if (error === "already sent") return res.status(409).json({ error: "already sent" });
    if (error) return res.status(502).json({ error: "mail provider failed", detail: error });
    res.json({ sent: true });
  } finally {
    sendInProgress = false;
  }
});