import { Plus } from "lucide-react";
import { useProjects } from "@/hooks/useSupabaseData";

export function ProjectList({ onAddProject }: { onAddProject?: () => void }) {
  const { data: projects, isLoading } = useProjects();
  const displayProjects = (projects ?? []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-card h-full">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-secondary rounded w-20" />
          {[1,2,3].map((i) => <div key={i} className="h-10 bg-secondary rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Project</h3>
        <button onClick={onAddProject}
          className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors">
          <Plus className="w-3 h-3" /> New
        </button>
      </div>
      <ul className="space-y-3">
        {displayProjects.map((p) => (
          <li key={p.id} className="flex items-center gap-3 cursor-pointer hover:bg-secondary rounded-lg px-2 py-1.5 transition-colors">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
              <p className="text-[11px] text-muted">
                {p.due_date ? `Due: ${new Date(p.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "No due date"}
              </p>
            </div>
          </li>
        ))}
        {displayProjects.length === 0 && (
          <p className="text-sm text-muted text-center py-4">No projects yet</p>
        )}
      </ul>
    </div>
  );
}
