import { Mail, Sparkles, Zap } from "lucide-react";

const stats = [
  { icon: Mail, label: "Emails Generated", value: "142" },
  { icon: Sparkles, label: "Avg. Personalization Score", value: "87%" },
  { icon: Zap, label: "Agent Runs Today", value: "3" },
];

export function OutreachStats() {
  return (
    <div className="gradient-primary rounded-2xl p-5 shadow-card h-full flex flex-col text-primary-foreground">
      <h3 className="text-base font-semibold text-primary-foreground/80 mb-4">Outreach Stats</h3>
      <div className="flex-1 flex flex-col justify-center space-y-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-foreground/15 flex items-center justify-center">
              <s.icon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="text-[10px] text-primary-foreground/60">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
