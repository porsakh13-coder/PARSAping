"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useSWRAuth";

interface Me {
  role: "user" | "admin";
}

interface HistoryPoint {
  ping_ms: number | null;
  jitter_ms: number | null;
  packet_loss: number | null;
  checked_at: string;
}

interface ConnectionLog {
  id: string;
  node_name: string;
  connected_at: string;
  disconnected_at: string | null;
  bytes_up: number;
  bytes_down: number;
  avg_ping_ms: number | null;
}

function ChartCard({ title, data, dataKey, color }: any) {
  return (
    <div className="glass-panel p-5">
      <h3 className="font-display mb-3 text-sm font-bold text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(58,200,255,0.1)" />
          <XAxis
            dataKey="checked_at"
            tickFormatter={(v) => new Date(v).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
            stroke="#5c6b8a"
            fontSize={10}
          />
          <YAxis stroke="#5c6b8a" fontSize={10} />
          <Tooltip
            contentStyle={{ background: "#0a0e1a", border: "1px solid rgba(58,200,255,0.3)", borderRadius: 8 }}
            labelFormatter={(v) => new Date(v).toLocaleString("fa-IR")}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.get<Me>("/me").then(setMe).catch(() => router.replace("/login"));
  }, [router]);

  const { data: history } = useApi<HistoryPoint[]>(me ? "/stats/history" : null, 30000);
  const { data: connections } = useApi<ConnectionLog[]>(me ? "/stats/connections" : null);

  return (
    <main className="min-h-screen pb-16">
      <Navbar isAdmin={me?.role === "admin"} />

      <div className="mx-4 mt-8 md:mx-8">
        <h1 className="font-display mb-6 text-2xl font-bold neon-text">آمار و نمودارها</h1>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ChartCard title="تاریخچه Ping (ms)" data={history} dataKey="ping_ms" color="#3ac8ff" />
          <ChartCard title="تاریخچه Jitter (ms)" data={history} dataKey="jitter_ms" color="#b14bff" />
          <ChartCard title="Packet Loss (%)" data={history} dataKey="packet_loss" color="#ff4bd8" />
        </div>

        <div className="glass-panel p-5">
          <h3 className="font-display mb-4 text-lg font-bold text-neon-green">تاریخچه اتصال</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neon-blue/20 text-gray-400">
                  <th className="p-2 text-right">سرور</th>
                  <th className="p-2 text-right">اتصال</th>
                  <th className="p-2 text-right">قطع</th>
                  <th className="p-2 text-right">پینگ میانگین</th>
                  <th className="p-2 text-right">حجم</th>
                </tr>
              </thead>
              <tbody>
                {connections?.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="p-2">{c.node_name}</td>
                    <td className="p-2">{new Date(c.connected_at).toLocaleString("fa-IR")}</td>
                    <td className="p-2">{c.disconnected_at ? new Date(c.disconnected_at).toLocaleString("fa-IR") : "—"}</td>
                    <td className="p-2">{c.avg_ping_ms ?? "—"} ms</td>
                    <td className="p-2">{(((c.bytes_up + c.bytes_down) / 1e6) || 0).toFixed(1)} MB</td>
                  </tr>
                ))}
                {!connections?.length && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">
                      هنوز اتصالی ثبت نشده
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
