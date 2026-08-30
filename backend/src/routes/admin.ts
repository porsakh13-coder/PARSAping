import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { writeAudit } from "../utils/audit";
import { removePeerFromInterface } from "../services/wireguard";

const router = Router();
router.use(requireAuth, requireAdmin);

/* ---------------------------- Users ---------------------------- */

router.get("/users", async (_req, res) => {
  const result = await pool.query(`
    SELECT u.id, u.email, u.role, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM peers p WHERE p.user_id = u.id AND p.is_revoked = FALSE) AS active_peers
    FROM users u ORDER BY u.created_at DESC
  `);
  return res.json(result.rows);
});

const toggleUserSchema = z.object({ isActive: z.boolean() });

router.patch("/users/:id/active", validateBody(toggleUserSchema), async (req, res) => {
  const { isActive } = req.body;
  await pool.query("UPDATE users SET is_active = $1 WHERE id = $2", [isActive, req.params.id]);
  await writeAudit({
    actorUserId: req.user!.id,
    action: isActive ? "admin.user.enable" : "admin.user.disable",
    targetType: "user",
    targetId: req.params.id,
    ip: req.ip,
  });
  return res.json({ ok: true });
});

const changeRoleSchema = z.object({ role: z.enum(["user", "admin"]) });

router.patch("/users/:id/role", validateBody(changeRoleSchema), async (req, res) => {
  await pool.query("UPDATE users SET role = $1 WHERE id = $2", [req.body.role, req.params.id]);
  await writeAudit({
    actorUserId: req.user!.id,
    action: "admin.user.role_change",
    targetType: "user",
    targetId: req.params.id,
    meta: { role: req.body.role },
    ip: req.ip,
  });
  return res.json({ ok: true });
});

/* ---------------------------- Nodes ---------------------------- */

router.get("/nodes", async (_req, res) => {
  const result = await pool.query(`
    SELECT n.*, (SELECT COUNT(*) FROM peers p WHERE p.node_id = n.id AND p.is_revoked = FALSE) AS active_peers
    FROM nodes n ORDER BY n.created_at DESC
  `);
  return res.json(result.rows);
});

const createNodeSchema = z.object({
  name: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  endpointHost: z.string().min(1).max(255),
  endpointPort: z.number().int().min(1).max(65535).default(51820),
  publicKey: z.string().min(40).max(64),
  interfaceName: z.string().min(1).max(20).default("wg0"),
  ipRange: z.string().min(1),
  dns: z.string().default("1.1.1.1"),
  mtu: z.number().int().min(1200).max(1500).default(1420),
  maxPeers: z.number().int().min(1).max(5000).default(250),
});

router.post("/nodes", validateBody(createNodeSchema), async (req, res) => {
  const b = req.body;
  const result = await pool.query(
    `INSERT INTO nodes (name, region, endpoint_host, endpoint_port, public_key, interface_name, ip_range, dns, mtu, max_peers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [b.name, b.region, b.endpointHost, b.endpointPort, b.publicKey, b.interfaceName, b.ipRange, b.dns, b.mtu, b.maxPeers]
  );
  await writeAudit({
    actorUserId: req.user!.id,
    action: "admin.node.create",
    targetType: "node",
    targetId: result.rows[0].id,
    ip: req.ip,
  });
  return res.status(201).json(result.rows[0]);
});

const updateNodeSchema = createNodeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.patch("/nodes/:id", validateBody(updateNodeSchema), async (req, res) => {
  const b = req.body;
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const map: Record<string, string> = {
    name: "name",
    region: "region",
    endpointHost: "endpoint_host",
    endpointPort: "endpoint_port",
    publicKey: "public_key",
    interfaceName: "interface_name",
    ipRange: "ip_range",
    dns: "dns",
    mtu: "mtu",
    maxPeers: "max_peers",
    isActive: "is_active",
  };

  for (const [key, col] of Object.entries(map)) {
    if (b[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(b[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE nodes SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Node not found" });

  await writeAudit({
    actorUserId: req.user!.id,
    action: "admin.node.update",
    targetType: "node",
    targetId: req.params.id,
    ip: req.ip,
  });
  return res.json(result.rows[0]);
});

router.delete("/nodes/:id", async (req, res) => {
  await pool.query("DELETE FROM nodes WHERE id = $1", [req.params.id]);
  await writeAudit({
    actorUserId: req.user!.id,
    action: "admin.node.delete",
    targetType: "node",
    targetId: req.params.id,
    ip: req.ip,
  });
  return res.json({ ok: true });
});

/* ---------------------------- Peers ---------------------------- */

router.get("/peers", async (_req, res) => {
  const result = await pool.query(`
    SELECT p.id, p.allocated_ip, p.is_revoked, p.created_at, p.revoked_at,
           u.email AS user_email, n.name AS node_name
    FROM peers p
    JOIN users u ON u.id = p.user_id
    JOIN nodes n ON n.id = p.node_id
    ORDER BY p.created_at DESC LIMIT 500
  `);
  return res.json(result.rows);
});

router.post("/peers/:id/revoke", async (req, res) => {
  const peerResult = await pool.query(
    `SELECT p.*, n.interface_name FROM peers p JOIN nodes n ON n.id = p.node_id WHERE p.id = $1`,
    [req.params.id]
  );
  const peer = peerResult.rows[0];
  if (!peer) return res.status(404).json({ error: "Peer not found" });

  await removePeerFromInterface(peer.interface_name, peer.public_key);
  await pool.query("UPDATE peers SET is_revoked = TRUE, revoked_at = now() WHERE id = $1", [
    peer.id,
  ]);

  await writeAudit({
    actorUserId: req.user!.id,
    action: "admin.peer.revoke",
    targetType: "peer",
    targetId: peer.id,
    ip: req.ip,
  });
  return res.json({ ok: true });
});

/* ------------------------- Subscriptions ------------------------- */

router.get("/subscriptions", async (_req, res) => {
  const result = await pool.query(`
    SELECT s.id, s.token, s.created_at, s.regenerated_at, u.email AS user_email
    FROM subscriptions s JOIN users u ON u.id = s.user_id
    ORDER BY s.created_at DESC
  `);
  // Mask tokens in listing — full token only shown to the owning user.
  const masked = result.rows.map((r) => ({ ...r, token: r.token.slice(0, 8) + "…" }));
  return res.json(masked);
});

/* ---------------------------- Audit log ---------------------------- */

router.get("/audit-logs", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const result = await pool.query(
    `SELECT al.id, al.action, al.target_type, al.target_id, al.meta, al.ip, al.created_at,
            u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ORDER BY al.created_at DESC LIMIT $1`,
    [limit]
  );
  return res.json(result.rows);
});

/* ---------------------------- Monitoring ---------------------------- */

router.get("/monitoring/overview", async (_req, res) => {
  const nodes = await pool.query(`
    SELECT n.id, n.name, n.region, n.is_active,
           h.ping_ms, h.jitter_ms, h.packet_loss, h.load_pct, h.online, h.checked_at,
           (SELECT COUNT(*) FROM peers p WHERE p.node_id = n.id AND p.is_revoked = FALSE) AS active_peers
    FROM nodes n
    LEFT JOIN LATERAL (
      SELECT * FROM node_health WHERE node_id = n.id ORDER BY checked_at DESC LIMIT 1
    ) h ON TRUE
    ORDER BY n.name
  `);

  const totals = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE is_active) AS active_users,
      (SELECT COUNT(*) FROM peers WHERE is_revoked = FALSE) AS active_peers,
      (SELECT COUNT(*) FROM nodes WHERE is_active = TRUE) AS active_nodes
  `);

  return res.json({ nodes: nodes.rows, totals: totals.rows[0] });
});

export default router;
