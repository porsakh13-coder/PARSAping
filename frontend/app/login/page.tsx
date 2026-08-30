"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/login", { email, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="glass-panel w-full max-w-md p-8 animate-floatUp">
        <h1 className="font-display neon-text mb-1 text-center text-2xl font-black tracking-widest">
          PARSAping
        </h1>
        <p className="mb-6 text-center text-sm text-gray-400">ورود به پنل مدیریت VPN</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <label className="mb-1 block text-xs font-semibold text-gray-400">ایمیل</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-cyber mb-4 w-full"
          placeholder="you@example.com"
        />

        <label className="mb-1 block text-xs font-semibold text-gray-400">گذرواژه</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-cyber mb-6 w-full"
          placeholder="••••••••"
        />

        <button type="submit" disabled={loading} className="btn-neon w-full">
          {loading ? "در حال ورود..." : "ورود"}
        </button>

        <p className="mt-5 text-center text-sm text-gray-400">
          حساب نداری؟{" "}
          <Link href="/register" className="text-neon-blue hover:underline">
            ثبت‌نام
          </Link>
        </p>
      </form>
    </main>
  );
}
