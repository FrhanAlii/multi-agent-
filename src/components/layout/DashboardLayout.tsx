import { useState } from "react";
import { motion } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function DarkOverlay() {
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (!isDark) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Exact signin gradient — bg-gradient-to-b from-[hsl(153,48%,19%)]/60 via-[hsl(153,38%,36%)]/50 to-black */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, hsla(153,48%,19%,0.60) 0%, hsla(153,38%,36%,0.50) 50%, hsl(0,0%,3%) 100%)",
        }}
      />
      {/* Noise texture — exact signin opacity */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Top-left glow — exact signin values */}
      <motion.div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, hsl(153,48%,19%) 0%, transparent 70%)" }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Bottom-right glow — exact signin values */}
      <motion.div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, hsl(153,30%,48%) 0%, transparent 70%)" }}
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.15, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background flex w-full">
        <DarkOverlay />
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div
          className={`flex-1 flex flex-col transition-all duration-200 relative ${
            collapsed ? "ml-[68px]" : "ml-[260px]"
          }`}
        >
          <TopBar />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
