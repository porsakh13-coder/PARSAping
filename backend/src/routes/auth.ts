import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { pool } from "../db/pool";
import { validateBody } from "../middleware/validate";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/jwt";
import { generateSubscriptionToken } from "../utils/crypto";
import { env } from "../config/env";
import { writeAudit } from "../utils/audit";
import { requireAuth } from "../middleware/auth";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE = "access_token";

function cookieOpts(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict" as const,
    maxAge: maxAgeMs,
    path: "/",
  };
}

router.post("/register", authLimiter, validateBody(registerSchema), async (req, res) => {
  const { email, password } = req.body;

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role`,
      [email, passwordHash]
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO subscriptions (user_id, token) VALUES ($1, $2)`,
      [user.id, generateSubscriptionToken()]
    );

    await client.query("COMMIT");

    await writeAudit({
      actorUserId: user.id,
      action: "user.register",
      targetType: "user",
      targetId: user.id,
      ip: req.ip,
    });

    await issueSession(res, user.id, user.role, req);
    return res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Register error:", (err as Error).message);
    return res.status(500).json({ error: "Registration failed" });
  } finally {
    client.release();
  }
});

router.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  // Constant-shape response to avoid user enumeration timing differences.
  const dummyHash = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO0h3G6z5X3ZfP6r7q7XlY8Xr8xVYyG1a";
  const valid = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, dummyHash);

  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: "This account has been disabled" });
  }

  await issueSession(res, user.id, user.role, req);
  await writeAudit({
    actorUserId: user.id,
    action: "user.login",
    targetType: "user",
    targetId: user.id,
    ip: req.ip,
  });

  return res.json({ id: user.id, email: user.email, role: user.role });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = verifyRefreshToken(token);
    const tokenHash = hashToken(token);

    const sessionResult = await pool.query(
      `SELECT id, user_id FROM sessions
       WHERE user_id = $1 AND refresh_token_hash = $2 AND revoked_at IS NULL AND expires_at > now()`,
      [payload.sub, tokenHash]
    );
    const session = sessionResult.rows[0];
    if (!session) return res.status(401).json({ error: "Invalid session" });

    const userResult = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [payload.sub]
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: "Account not active" });

    // Rotate refresh token.
    await pool.query("UPDATE sessions SET revoked_at = now() WHERE id = $1", [session.id]);
    await issueSession(res, user.id, user.role, req);

    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await pool.query(
      "UPDATE sessions SET revoked_at = now() WHERE refresh_token_hash = $1",
      [hashToken(token)]
    );
  }
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
  return res.json({ ok: true });
});

async function issueSession(
  res: import("express").Response,
  userId: string,
  role: "user" | "admin",
  req: import("express").Request
) {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken(userId);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hashToken(refreshToken), req.headers["user-agent"] ?? null, req.ip, expiresAt]
  );

  res.cookie(ACCESS_COOKIE, accessToken, cookieOpts(15 * 60 * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts(30 * 24 * 60 * 60 * 1000));
}

export default router;
