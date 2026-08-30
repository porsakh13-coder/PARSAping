import { pool } from "../db/pool";

/**
 * Finds the next free IP address inside a node's CIDR range that isn't
 * already assigned to an active peer on that node. Very small CIDR ranges
 * or fully-saturated nodes will throw.
 */
export async function allocateIp(nodeId: string, cidr: string): Promise<string> {
  const [baseIp, prefixStr] = cidr.split("/");
  const prefix = Number(prefixStr);
  const baseNum = ipToNumber(baseIp);
  const hostBits = 32 - prefix;
  const totalHosts = Math.pow(2, hostBits);

  const existing = await pool.query(
    `SELECT allocated_ip FROM peers WHERE node_id = $1 AND is_revoked = FALSE`,
    [nodeId]
  );
  const taken = new Set(existing.rows.map((r) => r.allocated_ip));

  // Skip network address (.0) and gateway (.1), stop before broadcast.
  for (let i = 2; i < totalHosts - 1; i++) {
    const candidate = numberToIp(baseNum + i);
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("No free IP addresses available on this node");
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join(".");
}
