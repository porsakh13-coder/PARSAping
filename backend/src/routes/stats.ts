import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { pingHost } from "../services/monitoring";

const router = Router();

/** Live snapshot for the dashboard's connected peer (or best node if none). */
router.get("/live", requireAuth, async (req, res) => {
  const activePeer = await pool.query(
    `SELECT p.id, n.endpoint_host, n.name AS node_name, n.region, p.created_at
     FROM peers p JOIN nodes n ON n.id = p.node_id
     WHERE p.user_id = $1 AND p.is_revoked = FALSE
     ORDER BY p.created_at DESC LIMIT 1`,
    [req.user!.id]
  );

  const peer = activePeer.rows[0];
  if (!peer) {
    return res.json({ connected: false });
  }

  const live = await pingHost(peer.endpoint_host, 4);
  const uptimeSeconds = Math.floor((Date.now() - new Date(peer.created_at).getTime()) / 1000);

  return res.json({
    connected: live.online,
    node: peer.node_name,
    region: peer.region,
    ping: live.pingMs,
    jitter: live.jitterMs,
    packetLoss: live.packetLoss,
    uptimeSeconds,
    // Traffic counters require a WireGuard stats agent on the node (`wg show <if> transfer`);
    // in simulated mode we report 0 rather than fabricate numbers.
    uploadBytes: 0,
    downloadBytes: 0,
  });
});

router.get("/history", requireAuth, async (req, res) => {
  const peerResult = await pool.query(
    `SELECT p.node_id FROM peers p
     WHERE p.user_id = $1 AND p.is_revoked = FALSE
     ORDER BY p.created_at DESC LIMIT 1`,
    [req.user!.id]
  );
  const peer = peerResult.rows[0];
  if (!peer) return res.json([]);

  const history = await pool.query(
    `SELECT ping_ms, jitter_ms, packet_loss, checked_at
     FROM node_health WHERE node_id = $1
     ORDER BY checked_at DESC LIMIT 50`,
    [peer.node_id]
  );
  return res.json(history.rows.reverse());
});

router.get("/connections", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT cl.id, cl.connected_at, cl.disconnected_at, cl.bytes_up, cl.bytes_down,
            cl.avg_ping_ms, cl.avg_jitter_ms, cl.avg_loss_pct, n.name AS node_name
     FROM connection_logs cl
     JOIN peers p ON p.id = cl.peer_id
     JOIN nodes n ON n.id = p.node_id
     WHERE p.user_id = $1
     ORDER BY cl.connected_at DESC LIMIT 50`,
    [req.user!.id]
  );
  return res.json(result.rows);
});

export default router;
