import { Router } from "express";
import { z } from "zod";
import { reimbursementInput } from "../schemas/reimbursement";
import * as repo from "../repository/reimbursements";

export const reimbursementsRouter = Router();

const idParam = z.coerce.number().int().positive();

reimbursementsRouter.get("/", async (_req, res) => {
  res.json(await repo.listReimbursements());
});

reimbursementsRouter.get("/:id", async (req, res) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });

  const row = await repo.getReimbursement(id.data);
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
});

reimbursementsRouter.post("/", async (req, res) => {
  const parsed = reimbursementInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  const row = await repo.createReimbursement(parsed.data);
  res.status(201).json(row);
});

reimbursementsRouter.put("/:id", async (req, res) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });

  const parsed = reimbursementInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const row = await repo.updateReimbursement(id.data, parsed.data);
  if (row) return res.json(row);

  // No row updated: either it doesn't exist, or it's locked because it was sent.
  const existing = await repo.getReimbursement(id.data);
  if (!existing) return res.status(404).json({ error: "not found" });
  return res.status(409).json({ error: "already sent; record is locked" });
});

reimbursementsRouter.delete("/:id", async (req, res) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });

  const row = await repo.deleteReimbursement(id.data);
  if (row) return res.status(204).end();

  const existing = await repo.getReimbursement(id.data);
  if (!existing) return res.status(404).json({ error: "not found" });
  return res.status(409).json({ error: "already sent; record is locked" });
});