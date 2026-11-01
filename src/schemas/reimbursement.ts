import { z } from "zod";

export const REIMBURSEMENT_TYPES = ["medical", "salary", "travel", "other"] as const;

// Kept as strings so the value never passes through a JavaScript float.
const amount = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "must be a non-negative number with up to 2 decimals");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

export const reimbursementInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(200),
  college_id: z.string().trim().min(1).max(50),
  reimbursement_type: z.enum(REIMBURSEMENT_TYPES),
  claimed_amount: amount,
  amount_received: amount,
  comment: z.string().trim().max(500).nullish(),
  reimbursed_on: isoDate,
});

export type ReimbursementInput = z.infer<typeof reimbursementInput>;
