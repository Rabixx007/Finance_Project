import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db";
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  signSession,
} from "../auth";

export const authRouter = Router();

const registerInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12, "must be at least 12 characters").max(128),
});

const loginInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

// Used when the email doesn't exist. Comparing against it means a wrong email
// and a wrong password take the same time, so timing can't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("placeholder-never-matches", 12);

// Tells the frontend whether to show the register form or the login form.
authRouter.get("/status", async (_req, res) => {
  const { rows } = await pool.query("SELECT EXISTS (SELECT 1 FROM users) AS has_user");
  res.json({ registrationOpen: !rows[0].has_user });
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);

  // Insert only when the table is empty. Registration closes after the first account.
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash)
     SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM users)
     RETURNING id, email`,
    [parsed.data.email, hash]
  );
  if (rows.length === 0) {
    return res.status(403).json({ error: "registration is closed" });
  }

  const user = rows[0];
  setSessionCookie(res, signSession(user.id, user.email));
  res.status(201).json({ id: user.id, email: user.email });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { rows } = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [parsed.data.email]
  );
  const user = rows[0];
  const ok = await bcrypt.compare(
    parsed.data.password,
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user || !ok) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  setSessionCookie(res, signSession(user.id, user.email));
  res.json({ id: user.id, email: user.email });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json(res.locals.session);
});