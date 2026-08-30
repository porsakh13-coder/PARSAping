import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "../db/pool";
import { buildClientConfig } from "../services/wireguard";
import { decryptSecret } from "../utils/crypto";

const router = Router();

const subLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /sub/:token — returns the latest active WireGuard config for that user.
// Token is a 32-byte random value (see generateSubscriptionToken); not guessable,
// and never logged.
router.get("/:token", subLimiter, async (req, res) => {
  const { token } = req.params;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) {
    return res.status(400).send("Invalid subscription token");
  }

  const subResult = await pool.query(
    "SELECT user_id FROM subscriptions WHERE token = $1",
    [token]
  );
  const sub = subResult.rows[0];
  if (!sub) return res.status(404).send("Subscription not found");

  const userResult = await pool.query(
    "SELECT is_active FROM users WHERE id = $1",
    [sub.user_id]
  );
  if (!userResult.rows[0]?.is_active) {
    return res.status(403).send("Account disabled");
  }

  const peerResult = await pool.query(
    `SELECT p.*, n.public_key AS node_public_key, n.endpoint_host, n.endpoint_port,
            n.dns, n.mtu
     FROM peers p JOIN nodes n ON n.id = p.node_id
     WHERE p.user_id = $1 AND p.is_revoked = FALSE
     ORDER BY p.created_at DESC LIMIT 1`,
    [sub.user_id]
  );
  const peer = peerResult.rows[0];
  if (!peer) return res.status(404).send("No active WireGuard config for this account yet");

  const conf = buildClientConfig({
    clientPrivateKey: decryptSecret(peer.private_key_encrypted),
    clientAddress: `${peer.allocated_ip}/32`,
    serverPublicKey: peer.node_public_key,
    serverEndpoint: `${peer.endpoint_host}:${peer.endpoint_port}`,
    dns: peer.dns,
    mtu: peer.mtu,
    allowedIps: peer.allowed_ips,
    persistentKeepalive: peer.persistent_keepalive,
  });

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="parsaping.conf"');
  return res.send(conf);
});

export default router;
