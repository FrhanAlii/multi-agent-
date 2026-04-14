import { Progress } from "@/components/ui/progress";

type AgentState = "idle" | "running" | "completed";

const stateConfig: Record<AgentState, { color: string; label: string }> = {
  idle: { color: "bg-muted", label: "Idle" },
  running: { color: "bg-primary animate-pulse", label: "Running" },
  completed: { color: "bg-success", label: "Completed" },
};

// Mock state
const mockState: AgentState = "running";
const processed = 14;
const total = 23;
const currentAction = "Researching John Smith at Stripe...";

export function AgentStatus() {
  const { color, label } = stateConfig[mockState];

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full flex flex-col">
      <h3 className="text-base font-semibold text-foreground mb-4">Agent Status</h3>

      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[11px] text-muted mb-1">
          <span>{processed} of {total} leads processed</span>
          <span>{Math.round((processed / total) * 100)}%</span>
        </div>
        <Progress value={(processed / total) * 100} className="h-2" />
      </div>

      <div className="flex-1 flex items-end">
        <p className="text-[11px] text-primary font-medium truncate">
          ⚡ {currentAction}
        </p>
      </div>
    </div>
  );
}
