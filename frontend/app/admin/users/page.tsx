"use client";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useSWRAuth";

interface AdminUser {
  id: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  active_peers: number;
}

export default function AdminUsersPage() {
  const { data: users, mutate } = useApi<AdminUser[]>("/admin/users");

  async function toggleActive(id: string, current: boolean) {
    await api.patch(`/admin/users/${id}/active`, { isActive: !current });
    mutate();
  }

  async function toggleRole(id: string, current: string) {
    await api.patch(`/admin/users/${id}/role`, { role: current === "admin" ? "user" : "admin" });
    mutate();
  }

  return (
    <div className="glass-panel p-5">
      <h3 className="font-display mb-4 text-lg font-bold text-neon-blue">مدیریت کاربران</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neon-blue/20 text-gray-400">
              <th className="p-2 text-right">ایمیل</th>
              <th className="p-2 text-right">نقش</th>
              <th className="p-2 text-right">وضعیت</th>
              <th className="p-2 text-right">Peerهای فعال</th>
              <th className="p-2 text-right">تاریخ عضویت</th>
              <th className="p-2 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <span className={u.role === "admin" ? "text-neon-purple" : "text-gray-300"}>
                    {u.role}
                  </span>
                </td>
                <td className="p-2">
                  <span className={`status-dot ${u.is_active ? "status-online" : "status-offline"}`} />
                </td>
                <td className="p-2">{u.active_peers}</td>
                <td className="p-2">{new Date(u.created_at).toLocaleDateString("fa-IR")}</td>
                <td className="flex gap-2 p-2">
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className="rounded border border-neon-blue/40 px-2 py-1 text-xs hover:bg-neon-blue/10"
                  >
                    {u.is_active ? "غیرفعال کن" : "فعال کن"}
                  </button>
                  <button
                    onClick={() => toggleRole(u.id, u.role)}
                    className="rounded border border-neon-purple/40 px-2 py-1 text-xs hover:bg-neon-purple/10"
                  >
                    {u.role === "admin" ? "حذف ادمین" : "ادمین کن"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
