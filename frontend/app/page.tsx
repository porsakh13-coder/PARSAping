"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    api
      .get("/me")
      .then(() => router.replace("/dashboard"))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="font-display neon-text animate-pulseGlow text-xl">PARSAping در حال بارگذاری...</p>
    </main>
  );
}
