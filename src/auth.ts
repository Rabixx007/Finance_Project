import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config";

export const COOKIE_NAME = "session";
const SESSION_MS = 2 * 60 * 60 * 1000; // 2 hours

export type Session = { sub: string; email: string };

// Cookie flags are applied the same way when setting and clearing,
// so the browser recognizes the cookie it's removing.
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.NODE_ENV === "production",
  path: "/",
};

export function signSession(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, config.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "2h",
  });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "login required" });

  try {
    // Pinning the algorithm stops tokens signed with a different method from being accepted.
    const payload = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as Session;
    res.locals.session = payload;
    next();
  } catch {
    return res.status(401).json({ error: "login required" });
  }
}