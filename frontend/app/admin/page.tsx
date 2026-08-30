"use client";
import StatCard from "@/components/StatCard";
import { useApi } from "@/lib/useSWRAuth";

interface Overview {
  nodes: Array<{
    id: string;
    name: string;
    region: string;
    is_active: boolean;
    ping_ms: number | null;
    packet_loss: number | null;
    load_pct: number | null;
    online: boolean | null;
    active_peers: number;
  }>;
  totals: {
    total_users: string;
    active_users: string;
    active_peers: string;
    active_nodes: string;
  };
}

export default function AdminOverview() {
  const { data } = useApi<Overview>("/admin/monitoring/overview", 15000);

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="کل کاربران" value={data?.totals.total_users ?? "—"} accent="blue" />
        <StatCard label="کاربران فعال" value={data?.totals.active_users ?? "—"} accent="green" />
        <StatCard label="Peerهای فعال" value={data?.totals.active_peers ?? "—"} accent="purple" />
        <StatCard label="Nodeهای فعال" value={data?.totals.active_nodes ?? "—"} accent="pink" />
      </div>

      <div className="glass-panel p-5">
        <h3 className="font-display mb-4 text-lg font-bold text-neon-blue">Server Monitoring</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neon-blue/20 text-gray-400">
                <th className="p-2 text-right">نام</th>
                <th className="p-2 text-right">منطقه</th>
                <th className="p-2 text-right">وضعیت</th>
                <th className="p-2 text-right">پینگ</th>
                <th className="p-2 text-right">لاس</th>
                <th className="p-2 text-right">لود</th>
                <th className="p-2 text-right">کاربران</th>
              </tr>
            </thead>
            <tbody>
              {data?.nodes.map((n) => (
                <tr key={n.id} className="border-b border-white/5">
                  <td className="p-2">{n.name}</td>
                  <td className="p-2">{n.region}</td>
                  <td className="p-2">
                    <span className={`status-dot ${n.online ? "status-online" : "status-offline"}`} />
                  </td>
                  <td className="p-2">{n.ping_ms ?? "—"} ms</td>
                  <td className="p-2">{n.packet_loss ?? "—"}%</td>
                  <td className="p-2">{n.load_pct ?? "—"}%</td>
                  <td className="p-2">{n.active_peers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
                    }
