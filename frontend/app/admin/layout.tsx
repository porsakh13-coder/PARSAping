"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

const tabs = [
  { href: "/admin", label: "نمای کلی" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/nodes", label: "Nodeها" },
  { href: "/admin/peers", label: "Peerها" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get<{ role: string }>("/me")
      .then((me) => {
        if (me.role !== "admin") router.replace("/dashboard");
        else setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-display neon-text animate-pulseGlow text-xl">در حال بررسی دسترسی...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <Navbar isAdmin />
      <div className="mx-4 mt-6 md:mx-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                pathname === t.href
                  ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/50"
                  : "text-gray-400 hover:text-neon-blue"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </main>
  );
}
