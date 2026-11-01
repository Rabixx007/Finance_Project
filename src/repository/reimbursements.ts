import { pool } from "../db";
import type { ReimbursementInput } from "../schemas/reimbursement";

// reimbursed_on is cast to text so pg doesn't turn it into a JS Date.
const COLUMNS = `
  id, email, name, college_id, reimbursement_type,
  claimed_amount, amount_received, comment,
  reimbursed_on::text AS reimbursed_on,
  mail_status, mail_sent_at, created_at`;

export async function listReimbursements() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM reimbursements ORDER BY reimbursed_on DESC, id DESC`
  );
  return rows;
}

export async function getReimbursement(id: number) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM reimbursements WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function createReimbursement(input: ReimbursementInput) {
  const { rows } = await pool.query(
    `INSERT INTO reimbursements
       (email, name, college_id, reimbursement_type, claimed_amount, amount_received, comment, reimbursed_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNS}`,
    [
      input.email,
      input.name,
      input.college_id,
      input.reimbursement_type,
      input.claimed_amount,
      input.amount_received,
      input.comment ?? null,
      input.reimbursed_on,
    ]
  );
  return rows[0];
}

// A row already marked 'sent' is locked: editing it would make the
// record disagree with the email the recipient received.
export async function updateReimbursement(id: number, input: ReimbursementInput) {
  const { rows } = await pool.query(
    `UPDATE reimbursements
        SET email = $2, name = $3, college_id = $4, reimbursement_type = $5,
            claimed_amount = $6, amount_received = $7, comment = $8, reimbursed_on = $9
      WHERE id = $1 AND mail_status <> 'sent'
    RETURNING ${COLUMNS}`,
    [
      id,
      input.email,
      input.name,
      input.college_id,
      input.reimbursement_type,
      input.claimed_amount,
      input.amount_received,
      input.comment ?? null,
      input.reimbursed_on,
    ]
  );
  return rows[0];
}

export async function deleteReimbursement(id: number) {
  const { rows } = await pool.query(
    `DELETE FROM reimbursements
      WHERE id = $1 AND mail_status <> 'sent'
    RETURNING id`,
    [id]
  );
  return rows[0];
}