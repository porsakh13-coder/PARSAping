"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useSWRAuth";

interface Me {
  id: string;
  role: "user" | "admin";
}

interface NodeInfo {
  id: string;
  name: string;
  region: string;
  ping_ms: number | null;
  jitter_ms: number | null;
  packet_loss: number | null;
  load_pct: number | null;
  online: boolean | null;
  active_peers: number;
}

interface Peer {
  id: string;
  node_id: string;
  is_revoked: boolean;
}

export default function ServersPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    api.get<Me>("/me").then(setMe).catch(() => router.replace("/login"));
  }, [router]);

  const { data: nodes, mutate: mutateNodes } = useApi<NodeInfo[]>(me ? "/nodes" : null, 15000);
  const { data: peers, mutate: mutatePeers } = useApi<Peer[]>(me ? "/peers" : null, 15000);

  const currentPeer = peers?.find((p) => !p.is_revoked);

  async function connectTo(nodeId: string) {
    setBusyId(nodeId);
    try {
      if (currentPeer) {
        await api.post(`/peers/${currentPeer.id}/revoke`);
      }
      const peer = await api.post<{ id: string }>("/peers", { nodeId });
      await mutatePeers();
      await mutateNodes();
      const qrRes = await api.get<{ qrDataUrl: string }>(`/peers/${peer.id}/qrcode`);
      setQr(qrRes.qrDataUrl);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "اتصال به سرور ناموفق بود");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen pb-16">
      <Navbar isAdmin={me?.role === "admin"} />

      <div className="mx-4 mt-8 md:mx-8">
        <h1 className="font-display mb-6 text-2xl font-bold neon-text">مدیریت سرورها</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nodes?.map((n) => (
            <div key={n.id} className="glass-panel animate-floatUp p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">{n.name}</h3>
                <span className={`status-dot ${n.online ? "status-online" : "status-offline"}`} />
              </div>
              <p className="mb-3 text-sm text-gray-400">{n.region}</p>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  پینگ: <span className="text-neon-blue">{n.ping_ms ?? "—"} ms</span>
                </div>
                <div>
                  جیتر: <span className="text-neon-purple">{n.jitter_ms ?? "—"} ms</span>
                </div>
                <div>
                  پکت لاس: <span className="text-neon-pink">{n.packet_loss ?? "—"}%</span>
                </div>
                <div>
                  لود: <span className="text-neon-green">{n.load_pct ?? "—"}%</span>
                </div>
              </div>

              <p className="mb-4 text-xs text-gray-500">{n.active_peers} کاربر فعال</p>

              <button
                onClick={() => connectTo(n.id)}
                disabled={busyId === n.id || !n.online}
                className="btn-neon w-full text-sm"
              >
                {busyId === n.id ? "در حال اتصال..." : currentPeer?.node_id === n.id ? "متصل" : "اتصال به این سرور"}
              </button>
            </div>
          ))}
        </div>

        {!nodes?.length && (
          <p className="text-gray-400">هیچ سروری هنوز اضافه نشده — از پنل ادمین یک Node اضافه کن.</p>
        )}
      </div>

      {qr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setQr(null)}
        >
          <div className="glass-panel p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display mb-3 text-center text-lg text-neon-blue">اسکن کن با اپ WireGuard</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="WireGuard QR Code" className="rounded-lg" />
            <button onClick={() => setQr(null)} className="btn-neon mt-4 w-full text-sm">
              بستن
            </button>
          </div>
        </div>
      )}
    </main>
  );
                                   }
