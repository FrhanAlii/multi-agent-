import { useEffect, useState } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 600;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{display}</span>;
}

interface StatCardProps { title: string; value: number; label: string; filled?: boolean; }

function StatCard({ title, value, label, filled }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-5 shadow-card relative overflow-hidden transition-all duration-150 hover:shadow-elevated ${
      filled ? "gradient-primary text-primary-foreground" : "bg-card text-card-foreground"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <p className={`text-sm font-medium ${filled ? "text-primary-foreground/80" : "text-muted"}`}>{title}</p>
        <button className={`w-8 h-8 rounded-full flex items-center justify-center ${filled ? "bg-primary-foreground/20" : "bg-secondary"}`}>
          <ArrowUpRight className={`w-4 h-4 ${filled ? "text-primary-foreground" : "text-muted"}`} />
        </button>
      </div>
      <p className="text-4xl font-bold mb-2"><AnimatedNumber value={value} /></p>
      <div className={`flex items-center gap-1 text-xs ${filled ? "text-primary-foreground/70" : "text-muted"}`}>
        <TrendingUp className="w-3 h-3" />
        <span>{label}</span>
      </div>
    </div>
  );
}

// Mock data for smartB AI leads
const mockStats = {
  total: 248,
  completed: 142,
  processing: 23,
  queued: 83,
};

export function StatCards() {
  const stats = [
    { title: "Total Leads", value: mockStats.total, label: "All leads imported", filled: true },
    { title: "Completed", value: mockStats.completed, label: "Emails generated" },
    { title: "Processing", value: mockStats.processing, label: "Agent working" },
    { title: "Queued", value: mockStats.queued, label: "Awaiting processing" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => <StatCard key={s.title} {...s} />)}
    </div>
  );
}
