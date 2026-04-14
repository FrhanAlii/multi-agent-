import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddProject } from "@/hooks/useSupabaseData";
import { Loader2 } from "lucide-react";

const COLORS = ["#1a4731", "#2d6a4f", "#40916c", "#52b788", "#f4a261", "#e63946"];

export function AddProjectModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const addProject = useAddProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addProject.mutateAsync({ name: name.trim(), description: description.trim(), status, color, due_date: dueDate || null });
    setName(""); setDescription(""); setStatus("active"); setDueDate(""); setColor(COLORS[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Add Project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Project Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none">
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={addProject.isPending}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {addProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Project
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
