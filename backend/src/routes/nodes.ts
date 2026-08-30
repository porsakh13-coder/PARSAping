import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const result = await pool.query(`
    SELECT
      n.id, n.name, n.region, n.endpoint_host, n.endpoint_port, n.is_active,
      h.ping_ms, h.jitter_ms, h.packet_loss, h.load_pct, h.online, h.checked_at,
      (SELECT COUNT(*) FROM peers p WHERE p.node_id = n.id AND p.is_revoked = FALSE) AS active_peers
    FROM nodes n
    LEFT JOIN LATERAL (
      SELECT * FROM node_health WHERE node_id = n.id ORDER BY checked_at DESC LIMIT 1
    ) h ON TRUE
    WHERE n.is_active = TRUE
    ORDER BY h.ping_ms ASC NULLS LAST
  `);
  return res.json(result.rows);
});

/** Returns the node the frontend should recommend (lowest ping, online, has capacity). */
router.get("/best", requireAuth, async (_req, res) => {
  const result = await pool.query(`
    SELECT n.id, n.name, n.region, h.ping_ms, h.jitter_ms, h.packet_loss
    FROM nodes n
    JOIN LATERAL (
      SELECT * FROM node_health WHERE node_id = n.id ORDER BY checked_at DESC LIMIT 1
    ) h ON TRUE
    WHERE n.is_active = TRUE AND h.online = TRUE
      AND (SELECT COUNT(*) FROM peers p WHERE p.node_id = n.id AND p.is_revoked = FALSE) < n.max_peers
    ORDER BY h.ping_ms ASC, h.packet_loss ASC
    LIMIT 1
  `);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "No available node found" });
  }
  return res.json(result.rows[0]);
});

router.get("/:id/history", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT ping_ms, jitter_ms, packet_loss, load_pct, online, checked_at
     FROM node_health WHERE node_id = $1
     ORDER BY checked_at DESC LIMIT 100`,
    [req.params.id]
  );
  return res.json(result.rows.reverse());
});

export default router;
