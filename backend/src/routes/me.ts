import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, role, is_active, created_at FROM users WHERE id = $1",
    [req.user!.id]
  );
  return res.json(result.rows[0]);
});

router.get("/subscription", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT token, created_at, regenerated_at FROM subscriptions WHERE user_id = $1",
    [req.user!.id]
  );
  const sub = result.rows[0];
  if (!sub) return res.status(404).json({ error: "No subscription found" });

  return res.json({
    url: `${env.BASE_URL}/sub/${sub.token}`,
    token: sub.token,
    createdAt: sub.created_at,
    regeneratedAt: sub.regenerated_at,
  });
});

router.post("/subscription/regenerate", requireAuth, async (req, res) => {
  const crypto = await import("../utils/crypto");
  const newToken = crypto.generateSubscriptionToken();
  await pool.query(
    "UPDATE subscriptions SET token = $1, regenerated_at = now() WHERE user_id = $2",
    [newToken, req.user!.id]
  );
  return res.json({ url: `${env.BASE_URL}/sub/${newToken}` });
});

export default router;
