import { useState } from "react";
import { Plus, Mail, Trash2 } from "lucide-react";
import { useProjectMembers, useTasks, useProjects, useDeleteMember } from "@/hooks/useSupabaseData";
import { AddMemberModal } from "@/components/modals/AddMemberModal";

export default function Team() {
  const [showModal, setShowModal] = useState(false);
  const { data: members, isLoading } = useProjectMembers();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const deleteMember = useDeleteMember();

  if (isLoading) {
    return <div className="max-w-[1200px] mx-auto"><div className="h-96 animate-pulse bg-card rounded-2xl" /></div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email History</h1>
          <p className="text-sm text-muted mt-1">View all generated outreach emails and their status.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="gradient-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(members ?? []).map((m) => {
          const initials = m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const memberTasks = (tasks ?? []).filter((t) => t.project_id === m.project_id);
          const projectName = projects?.find((p) => p.id === m.project_id)?.name || "No project";
          return (
            <div key={m.id} className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary text-lg font-bold">{initials}</div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-foreground">{m.name}</p>
                  <p className="text-sm text-muted">{m.role}</p>
                </div>
                <button onClick={() => deleteMember.mutate(m.id)} className="text-destructive/50 hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{memberTasks.length}</p>
                  <p className="text-[10px] text-muted">Active Tasks</p>
                </div>
                <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{projectName !== "No project" ? 1 : 0}</p>
                  <p className="text-[10px] text-muted">Projects</p>
                </div>
              </div>
              <button className="w-full bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/10 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" /> View Profile
              </button>
            </div>
          );
        })}
        {(members ?? []).length === 0 && (
          <div className="col-span-full text-center py-12 text-muted">No team members yet. Click "Invite Member" to add someone.</div>
        )}
      </div>
      <AddMemberModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
