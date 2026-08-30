import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { pool } from "../db/pool";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "user" | "admin" };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = verifyAccessToken(token);

    // Ensure the account still exists and is active on every request.
    const result = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Account not active" });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
