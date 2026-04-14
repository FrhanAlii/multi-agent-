import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddTask, useProjects } from "@/hooks/useSupabaseData";
import { Loader2 } from "lucide-react";

export function AddTaskModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const addTask = useAddTask();
  const { data: projects } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addTask.mutateAsync({
      title: title.trim(), description: description.trim(),
      project_id: projectId || null, assignee_id: null,
      status, priority, due_date: dueDate || null,
    });
    setTitle(""); setDescription(""); setProjectId(""); setStatus("todo"); setPriority("medium"); setDueDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none">
              <option value="">No project</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none">
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            </div>
          </div>
          <button type="submit" disabled={addTask.isPending}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {addTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Task
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
