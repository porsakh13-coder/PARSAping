import { pool } from "../db/pool";

export async function writeAudit(params: {
  actorUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}) {
  const { actorUserId, action, targetType, targetId, meta, ip } = params;
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorUserId ?? null, action, targetType ?? null, targetId ?? null, meta ?? {}, ip ?? null]
  );
}
