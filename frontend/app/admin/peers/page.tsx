"use client";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useSWRAuth";

interface AdminPeer {
  id: string;
  allocated_ip: string;
  is_revoked: boolean;
  created_at: string;
  revoked_at: string | null;
  user_email: string;
  node_name: string;
}

export default function AdminPeersPage() {
  const { data: peers, mutate } = useApi<AdminPeer[]>("/admin/peers");

  async function revoke(id: string) {
    if (!confirm("این Peer باطل شود؟")) return;
    await api.post(`/admin/peers/${id}/revoke`);
    mutate();
  }

  return (
    <div className="glass-panel p-5">
      <h3 className="font-display mb-4 text-lg font-bold text-neon-blue">مدیریت Peerها</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neon-blue/20 text-gray-400">
              <th className="p-2 text-right">کاربر</th>
              <th className="p-2 text-right">Node</th>
              <th className="p-2 text-right">IP</th>
              <th className="p-2 text-right">وضعیت</th>
              <th className="p-2 text-right">ساخته‌شده</th>
              <th className="p-2 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {peers?.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="p-2">{p.user_email}</td>
                <td className="p-2">{p.node_name}</td>
                <td className="p-2" dir="ltr">
                  {p.allocated_ip}
                </td>
                <td className="p-2">
                  <span className={`status-dot ${!p.is_revoked ? "status-online" : "status-offline"}`} />
                </td>
                <td className="p-2">{new Date(p.created_at).toLocaleDateString("fa-IR")}</td>
                <td className="p-2">
                  {!p.is_revoked && (
                    <button
                      onClick={() => revoke(p.id)}
                      className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
