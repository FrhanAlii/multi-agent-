import { Plus } from "lucide-react";
import { useProjectMembers, useTasks } from "@/hooks/useSupabaseData";

const statusStyles: Record<string, string> = {
  done: "bg-success/10 text-success",
  inprogress: "bg-primary/10 text-primary",
  review: "bg-warning/10 text-warning",
  todo: "bg-muted/20 text-muted",
};

const statusLabels: Record<string, string> = {
  done: "Completed",
  inprogress: "In Progress",
  review: "In Review",
  todo: "Pending",
};

export function TeamCollaboration({ onAddMember }: { onAddMember?: () => void }) {
  const { data: members, isLoading } = useProjectMembers();
  const { data: tasks } = useTasks();

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-card h-full animate-pulse">
        <div className="h-5 bg-secondary rounded w-40 mb-4" />
        {[1,2,3].map((i) => <div key={i} className="h-12 bg-secondary rounded-lg mb-3" />)}
      </div>
    );
  }

  const displayMembers = (members ?? []).slice(0, 4);

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Team Collaboration</h3>
        <button onClick={onAddMember}
          className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors">
          <Plus className="w-3 h-3" /> Add Member
        </button>
      </div>
      <ul className="space-y-3">
        {displayMembers.map((m) => {
          const initials = m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          // Find a task for this member's project
          const memberTask = tasks?.find((t) => t.project_id === m.project_id);
          const taskStatus = memberTask?.status || "todo";

          return (
            <li key={m.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <p className="text-[11px] text-muted truncate">
                  {memberTask ? <>Working on <span className="font-semibold text-foreground">{memberTask.title}</span></> : "No active task"}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyles[taskStatus] || statusStyles.todo}`}>
                {statusLabels[taskStatus] || "Pending"}
              </span>
            </li>
          );
        })}
        {displayMembers.length === 0 && (
          <p className="text-sm text-muted text-center py-4">No team members yet</p>
        )}
      </ul>
    </div>
  );
}
