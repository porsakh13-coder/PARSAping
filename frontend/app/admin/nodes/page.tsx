"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useSWRAuth";

interface AdminNode {
  id: string;
  name: string;
  region: string;
  endpoint_host: string;
  endpoint_port: number;
  is_active: boolean;
  active_peers: number;
  max_peers: number;
}

const emptyForm = {
  name: "",
  region: "",
  endpointHost: "",
  endpointPort: 51820,
  publicKey: "",
  ipRange: "10.66.0.0/24",
  dns: "1.1.1.1",
  mtu: 1420,
  maxPeers: 250,
};

export default function AdminNodesPage() {
  const { data: nodes, mutate } = useApi<AdminNode[]>("/admin/nodes");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createNode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/admin/nodes", form);
      setForm(emptyForm);
      setShowForm(false);
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ساخت Node ناموفق بود");
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await api.patch(`/admin/nodes/${id}`, { isActive: !current });
    mutate();
  }

  async function deleteNode(id: string) {
    if (!confirm("حذف این Node و همه Peerهای متصل به آن؟")) return;
    await api.delete(`/admin/nodes/${id}`);
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-neon-blue">مدیریت Nodeها</h3>
        <button onClick={() => setShowForm((s) => !s)} className="btn-neon text-xs">
          {showForm ? "بستن" : "+ افزودن Node"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createNode} className="glass-panel grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
          {error && (
            <div className="col-span-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-gray-400">نام</label>
            <input required className="input-cyber w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">منطقه</label>
            <input required className="input-cyber w-full" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Endpoint Host</label>
            <input required className="input-cyber w-full" dir="ltr" value={form.endpointHost} onChange={(e) => setForm({ ...form, endpointHost: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">UDP Port</label>
            <input type="number" required className="input-cyber w-full" dir="ltr" value={form.endpointPort} onChange={(e) => setForm({ ...form, endpointPort: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">Public Key سرور (wg pubkey)</label>
            <input required className="input-cyber w-full" dir="ltr" value={form.publicKey} onChange={(e) => setForm({ ...form, publicKey: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">IP Range (CIDR)</label>
            <input required className="input-cyber w-full" dir="ltr" value={form.ipRange} onChange={(e) => setForm({ ...form, ipRange: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">DNS</label>
            <input required className="input-cyber w-full" dir="ltr" value={form.dns} onChange={(e) => setForm({ ...form, dns: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">MTU</label>
            <input type="number" required className="input-cyber w-full" dir="ltr" value={form.mtu} onChange={(e) => setForm({ ...form, mtu: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">حداکثر کاربران</label>
            <input type="number" required className="input-cyber w-full" dir="ltr" value={form.maxPeers} onChange={(e) => setForm({ ...form, maxPeers: Number(e.target.value) })} />
          </div>
          <button type="submit" className="btn-neon md:col-span-2">
            ذخیره Node
          </button>
        </form>
      )}

      <div className="glass-panel p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neon-blue/20 text-gray-400">
                <th className="p-2 text-right">نام</th>
                <th className="p-2 text-right">منطقه</th>
                <th className="p-2 text-right">Endpoint</th>
                <th className="p-2 text-right">وضعیت</th>
                <th className="p-2 text-right">کاربران</th>
                <th className="p-2 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {nodes?.map((n) => (
                <tr key={n.id} className="border-b border-white/5">
                  <td className="p-2">{n.name}</td>
                  <td className="p-2">{n.region}</td>
                  <td className="p-2" dir="ltr">
                    {n.endpoint_host}:{n.endpoint_port}
                  </td>
                  <td className="p-2">
                    <span className={`status-dot ${n.is_active ? "status-online" : "status-offline"}`} />
                  </td>
                  <td className="p-2">
                    {n.active_peers}/{n.max_peers}
                  </td>
                  <td className="flex gap-2 p-2">
                    <button
                      onClick={() => toggleActive(n.id, n.is_active)}
                      className="rounded border border-neon-blue/40 px-2 py-1 text-xs hover:bg-neon-blue/10"
                    >
                      {n.is_active ? "غیرفعال" : "فعال"}
                    </button>
                    <button
                      onClick={() => deleteNode(n.id)}
                      className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
              }
