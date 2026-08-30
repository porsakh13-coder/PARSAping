import { execFile } from "child_process";
import { promisify } from "util";
import { pool } from "../db/pool";

const execFileAsync = promisify(execFile);

export interface PingResult {
  pingMs: number | null;
  jitterMs: number | null;
  packetLoss: number; // percentage 0-100
  online: boolean;
}

/**
 * Pings a host a handful of times using the system `ping` binary and
 * derives average latency, jitter (mean deviation between consecutive
 * RTTs) and packet loss. Works cross-platform on any Linux container.
 */
export async function pingHost(host: string, count = 5): Promise<PingResult> {
  try {
    const { stdout } = await execFileAsync("ping", ["-c", String(count), "-W", "1", host]);
    const rtts = Array.from(stdout.matchAll(/time=([\d.]+)/g)).map((m) => parseFloat(m[1]));

    const lossMatch = stdout.match(/(\d+)% packet loss/);
    const packetLoss = lossMatch ? Number(lossMatch[1]) : 100;

    if (rtts.length === 0) {
      return { pingMs: null, jitterMs: null, packetLoss: 100, online: false };
    }

    const avg = rtts.reduce((a, b) => a + b, 0) / rtts.length;

    let jitterSum = 0;
    for (let i = 1; i < rtts.length; i++) {
      jitterSum += Math.abs(rtts[i] - rtts[i - 1]);
    }
    const jitter = rtts.length > 1 ? jitterSum / (rtts.length - 1) : 0;

    return {
      pingMs: Math.round(avg * 100) / 100,
      jitterMs: Math.round(jitter * 100) / 100,
      packetLoss,
      online: packetLoss < 100,
    };
  } catch {
    return { pingMs: null, jitterMs: null, packetLoss: 100, online: false };
  }
}

/** Runs a health check against every active node and stores a sample. */
export async function healthCheckAllNodes() {
  const nodes = await pool.query(
    "SELECT id, endpoint_host FROM nodes WHERE is_active = TRUE"
  );

  for (const node of nodes.rows) {
    const result = await pingHost(node.endpoint_host);
    // Simple synthetic "load" proxy — in production this would come from
    // a lightweight agent on the node reporting real CPU/connection count.
    const load = Math.min(100, Math.round(Math.random() * 40 + (result.online ? 10 : 0)));

    await pool.query(
      `INSERT INTO node_health (node_id, ping_ms, jitter_ms, packet_loss, load_pct, online)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [node.id, result.pingMs, result.jitterMs, result.packetLoss, load, result.online]
    );
  }
}

/** Starts periodic health checks (every intervalMs). Returns a stop function. */
export function startHealthCheckLoop(intervalMs = 60_000) {
  const timer = setInterval(() => {
    healthCheckAllNodes().catch((err) =>
      console.error("Health check loop error:", err.message)
    );
  }, intervalMs);
  return () => clearInterval(timer);
}
