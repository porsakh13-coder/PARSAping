"use client";
import { useApi } from "@/lib/useSWRAuth";

interface AuditEntry {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown>;
  ip: string | null;
  created_at: string;
  actor_email: string | null;
}

export default function AdminAuditPage() {
  const { data: logs } = useApi<AuditEntry[]>("/admin/audit-logs", 20000);

  return (
    <div className="glass-panel p-5">
      <h3 className="font-display mb-4 text-lg font-bold text-neon-blue">Audit Log</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neon-blue/20 text-gray-400">
              <th className="p-2 text-right">زمان</th>
              <th className="p-2 text-right">عملیات</th>
              <th className="p-2 text-right">توسط</th>
              <th className="p-2 text-right">هدف</th>
              <th className="p-2 text-right">IP</th>
              <th className="p-2 text-right">جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((l) => (
              <tr key={l.id} className="border-b border-white/5 align-top">
                <td className="whitespace-nowrap p-2 text-xs text-gray-400">
                  {new Date(l.created_at).toLocaleString("fa-IR")}
                </td>
                <td className="p-2">
                  <span className="rounded bg-neon-purple/10 px-2 py-1 text-xs text-neon-purple">
                    {l.action}
                  </span>
                </td>
                <td className="p-2 text-xs">{l.actor_email ?? "—"}</td>
                <td className="p-2 text-xs">
                  {l.target_type ? `${l.target_type}:${l.target_id?.slice(0, 8)}` : "—"}
                </td>
                <td className="p-2 text-xs" dir="ltr">
                  {l.ip ?? "—"}
                </td>
                <td className="max-w-xs truncate p-2 text-xs text-gray-500">
                  {l.meta && Object.keys(l.meta).length > 0 ? JSON.stringify(l.meta) : "—"}
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  هنوز رویدادی ثبت نشده
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
