import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PARSAping | Gaming VPN Control Panel",
  description: "WireGuard Gaming VPN management — real-time ping, jitter, and packet loss monitoring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <body>{children}</body>
    </html>
  );
}
