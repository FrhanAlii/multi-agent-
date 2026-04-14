import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddMember, useProjects } from "@/hooks/useSupabaseData";
import { Loader2 } from "lucide-react";

export function AddMemberModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [projectId, setProjectId] = useState("");
  const addMember = useAddMember();
  const { data: projects } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    await addMember.mutateAsync({ name: name.trim(), email: email.trim(), role, project_id: projectId || null });
    setName(""); setEmail(""); setRole("member"); setProjectId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Add Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none">
                <option value="member">Member</option>
                <option value="owner">Owner</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none">
                <option value="">None</option>
                {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={addMember.isPending}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {addMember.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Add Member
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
