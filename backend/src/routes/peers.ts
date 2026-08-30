import { Router } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { generateKeyPair, buildClientConfig, addPeerToInterface, removePeerFromInterface } from "../services/wireguard";
import { allocateIp } from "../services/ipAllocator";
import { encryptSecret, decryptSecret } from "../utils/crypto";
import { writeAudit } from "../utils/audit";

const router = Router();

const createPeerSchema = z.object({
  nodeId: z.string().uuid(),
});

router.get("/", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.node_id, n.name AS node_name, n.region, p.allocated_ip,
            p.is_revoked, p.created_at, p.revoked_at
     FROM peers p JOIN nodes n ON n.id = p.node_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [req.user!.id]
  );
  return res.json(result.rows);
});

router.post("/", requireAuth, validateBody(createPeerSchema), async (req, res) => {
  const { nodeId } = req.body;

  const nodeResult = await pool.query(
    "SELECT * FROM nodes WHERE id = $1 AND is_active = TRUE",
    [nodeId]
  );
  const node = nodeResult.rows[0];
  if (!node) return res.status(404).json({ error: "Node not found or inactive" });

  const activeCount = await pool.query(
    "SELECT COUNT(*) FROM peers WHERE node_id = $1 AND is_revoked = FALSE",
    [nodeId]
  );
  if (Number(activeCount.rows[0].count) >= node.max_peers) {
    return res.status(409).json({ error: "This node is at capacity, please pick another" });
  }

  try {
    const ip = await allocateIp(nodeId, node.ip_range);
    const keys = await generateKeyPair(); // never logged

    const insertResult = await pool.query(
      `INSERT INTO peers (user_id, node_id, public_key, private_key_encrypted, allocated_ip)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, node_id, allocated_ip, created_at`,
      [req.user!.id, nodeId, keys.publicKey, encryptSecret(keys.privateKey), ip]
    );
    const peer = insertResult.rows[0];

    await addPeerToInterface(node.interface_name, keys.publicKey, `${ip}/32`);

    await writeAudit({
      actorUserId: req.user!.id,
      action: "peer.create",
      targetType: "peer",
      targetId: peer.id,
      meta: { nodeId },
      ip: req.ip,
    });

    return res.status(201).json({
      id: peer.id,
      nodeId: peer.node_id,
      allocatedIp: peer.allocated_ip,
      createdAt: peer.created_at,
    });
  } catch (err) {
    console.error("Peer creation error:", (err as Error).message);
    return res.status(500).json({ error: "Failed to create peer" });
  }
});

async function loadOwnedPeer(peerId: string, userId: string) {
  const result = await pool.query(
    `SELECT p.*, n.public_key AS node_public_key, n.endpoint_host, n.endpoint_port,
            n.dns, n.mtu, n.interface_name
     FROM peers p JOIN nodes n ON n.id = p.node_id
     WHERE p.id = $1 AND p.user_id = $2`,
    [peerId, userId]
  );
  return result.rows[0];
}

router.get("/:id/config", requireAuth, async (req, res) => {
  const peer = await loadOwnedPeer(req.params.id, req.user!.id);
  if (!peer) return res.status(404).json({ error: "Peer not found" });
  if (peer.is_revoked) return res.status(410).json({ error: "This peer has been revoked" });

  const privateKey = decryptSecret(peer.private_key_encrypted);
  const conf = buildClientConfig({
    clientPrivateKey: privateKey,
    clientAddress: `${peer.allocated_ip}/32`,
    serverPublicKey: peer.node_public_key,
    serverEndpoint: `${peer.endpoint_host}:${peer.endpoint_port}`,
    dns: peer.dns,
    mtu: peer.mtu,
    allowedIps: peer.allowed_ips,
    persistentKeepalive: peer.persistent_keepalive,
  });

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="parsaping-${peer.id}.conf"`);
  return res.send(conf);
});

router.get("/:id/qrcode", requireAuth, async (req, res) => {
  const peer = await loadOwnedPeer(req.params.id, req.user!.id);
  if (!peer) return res.status(404).json({ error: "Peer not found" });
  if (peer.is_revoked) return res.status(410).json({ error: "This peer has been revoked" });

  const privateKey = decryptSecret(peer.private_key_encrypted);
  const conf = buildClientConfig({
    clientPrivateKey: privateKey,
    clientAddress: `${peer.allocated_ip}/32`,
    serverPublicKey: peer.node_public_key,
    serverEndpoint: `${peer.endpoint_host}:${peer.endpoint_port}`,
    dns: peer.dns,
    mtu: peer.mtu,
    allowedIps: peer.allowed_ips,
    persistentKeepalive: peer.persistent_keepalive,
  });

  const dataUrl = await QRCode.toDataURL(conf, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
  return res.json({ qrDataUrl: dataUrl });
});

router.post("/:id/revoke", requireAuth, async (req, res) => {
  const peer = await loadOwnedPeer(req.params.id, req.user!.id);
  if (!peer) return res.status(404).json({ error: "Peer not found" });
  if (peer.is_revoked) return res.status(200).json({ ok: true, alreadyRevoked: true });

  await removePeerFromInterface(peer.interface_name, peer.public_key);
  await pool.query("UPDATE peers SET is_revoked = TRUE, revoked_at = now() WHERE id = $1", [
    peer.id,
  ]);

  await writeAudit({
    actorUserId: req.user!.id,
    action: "peer.revoke",
    targetType: "peer",
    targetId: peer.id,
    ip: req.ip,
  });

  return res.json({ ok: true });
});

export default router;
