"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useSWRAuth";

interface Me {
  id: string;
  email: string;
  role: "user" | "admin";
}

interface LiveStats {
  connected: boolean;
  node?: string;
  region?: string;
  ping?: number | null;
  jitter?: number | null;
  packetLoss?: number | null;
  uptimeSeconds?: number;
  uploadBytes?: number;
  downloadBytes?: number;
}

interface BestNode {
  id: string;
  name: string;
  region: string;
  ping_ms: number | null;
}

interface Peer {
  id: string;
  node_id: string;
  node_name: string;
  region: string;
  allocated_ip: string;
  is_revoked: boolean;
  created_at: string;
}

interface Subscription {
  url: string;
}

function formatUptime(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}س ${m}د ${s}ث`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<Me>("/me").then(setMe).catch(() => router.replace("/login"));
  }, [router]);

  const { data: live, mutate: mutateLive } = useApi<LiveStats>(me ? "/stats/live" : null, 5000);
  const { data: peers, mutate: mutatePeers } = useApi<Peer[]>(me ? "/peers" : null, 15000);
  const { data: sub } = useApi<Subscription>(me ? "/me/subscription" : null);

  const activePeer = peers?.find((p) => !p.is_revoked);

  async function handleConnect() {
    setConnecting(true);
    try {
      const best = await api.get<BestNode>("/nodes/best");
      await api.post("/peers", { nodeId: best.id });
      await mutatePeers();
      await mutateLive();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "اتصال ناموفق بود");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!activePeer) return;
    setConnecting(true);
    try {
      await api.post(`/peers/${activePeer.id}/revoke`);
      await mutatePeers();
      await mutateLive();
    } finally {
      setConnecting(false);
    }
  }

  async function copySub() {
    if (!sub?.url) return;
    await navigator.clipboard.writeText(sub.url);
    setCopyMsg("کپی شد!");
    setTimeout(() => setCopyMsg(null), 2000);
  }

  if (!me) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-display neon-text animate-pulseGlow text-xl">در حال بارگذاری...</p>
      </main>
    );
  }

  const isConnected = !!activePeer && live?.connected;

  return (
    <main className="min-h-screen pb-16">
      <Navbar isAdmin={me.role === "admin"} />

      <div className="mx-4 mt-8 md:mx-8">
        <h1 className="font-display mb-6 text-2xl font-bold">
          خوش اومدی، <span className="neon-text">{me.email.split("@")[0]}</span>
        </h1>

        {/* Connect button */}
        <div className="glass-panel mb-8 flex flex-col items-center justify-center gap-4 p-10">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${isConnected ? "status-online" : "status-offline"}`} />
            <span className="text-sm text-gray-300">
              {isConnected ? `متصل به ${live?.node} (${live?.region})` : "قطع"}
            </span>
          </div>

          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={connecting}
            className={`font-display h-40 w-40 rounded-full text-lg font-black tracking-widest transition-all md:h-48 md:w-48 ${
              isConnected
                ? "border-2 border-neon-pink bg-neon-pink/10 text-neon-pink shadow-[0_0_25px_rgba(255,75,216,0.5)] hover:shadow-[0_0_40px_rgba(255,75,216,0.8)]"
                : "border-2 border-neon-green bg-neon-green/10 text-neon-green shadow-[0_0_25px_rgba(57,255,156,0.5)] hover:shadow-[0_0_40px_rgba(57,255,156,0.8)]"
            } ${connecting ? "opacity-50" : ""} animate-pulseGlow`}
          >
            {connecting ? "..." : isConnected ? "DISCONNECT" : "CONNECT"}
          </button>

          {activePeer && (
            <div className="flex flex-wrap justify-center gap-3">
              
                href={`/api/peers/${activePeer.id}/config`}
                className="btn-neon text-xs"
                download
              >
                دانلود .conf
              </a>
              <a href={`/servers`} className="btn-neon text-xs">
                نمایش QR / تغییر سرور
              </a>
            </div>
          )}
        </div>

        {/* Live stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="پینگ" value={live?.ping ?? "—"} unit="ms" accent="blue" />
          <StatCard label="جیتر" value={live?.jitter ?? "—"} unit="ms" accent="purple" />
          <StatCard label="پکت لاس" value={live?.packetLoss ?? "—"} unit="%" accent="pink" />
          <StatCard label="آپلود" value={((live?.uploadBytes ?? 0) / 1e6).toFixed(1)} unit="MB" accent="green" />
          <StatCard label="دانلود" value={((live?.downloadBytes ?? 0) / 1e6).toFixed(1)} unit="MB" accent="green" />
          <StatCard label="آپ‌تایم" value={formatUptime(live?.uptimeSeconds)} accent="blue" />
        </div>

        {/* Subscription link */}
        <div className="glass-panel p-6">
          <h2 className="font-display mb-3 text-lg font-bold text-neon-blue">لینک Subscription</h2>
          <p className="mb-3 text-sm text-gray-400">
            این لینک اختصاصی تو رو می‌تونی توی کلاینت WireGuard وارد کنی تا کانفیگ به‌روز دریافت بشه.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={sub?.url ?? "در حال بارگذاری..."}
              className="input-cyber flex-1 text-xs"
              dir="ltr"
            />
            <button onClick={copySub} className="btn-neon whitespace-nowrap text-xs">
              {copyMsg ?? "کپی لینک"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
        }
