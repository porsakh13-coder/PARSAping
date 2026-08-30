"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "داشبورد" },
  { href: "/servers", label: "سرورها" },
  { href: "/stats", label: "آمار" },
];

export default function Navbar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    router.push("/login");
  }

  return (
    <nav className="glass-panel mx-4 mt-4 flex items-center justify-between px-6 py-3 md:mx-8">
      <Link href="/dashboard" className="font-display text-xl font-black neon-text tracking-wider">
        PARSA<span className="text-neon-green">ping</span>
      </Link>

      <div className="hidden items-center gap-6 md:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-semibold transition-colors ${
              pathname === l.href ? "text-neon-blue" : "text-gray-400 hover:text-neon-blue"
            }`}
          >
            {l.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={`text-sm font-semibold transition-colors ${
              pathname?.startsWith("/admin") ? "text-neon-purple" : "text-gray-400 hover:text-neon-purple"
            }`}
          >
            پنل ادمین
          </Link>
        )}
      </div>

      <button onClick={logout} className="btn-neon text-xs">
        خروج
      </button>
    </nav>
  );
}
