import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddEvent, useUpdateEvent, useDeleteEvent, useProjects, type CalendarEvent } from "@/hooks/useSupabaseData";
import { Loader2, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string;
  editEvent?: CalendarEvent | null;
}

export function AddEventModal({ open, onOpenChange, defaultDate, editEvent }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const addEvent = useAddEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const { data: projects } = useProjects();

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description || "");
      setProjectId(editEvent.project_id || "");
      setStartTime(editEvent.start_time ? editEvent.start_time.slice(0, 16) : "");
      setEndTime(editEvent.end_time ? editEvent.end_time.slice(0, 16) : "");
    } else {
      setTitle(""); setDescription(""); setProjectId("");
      setStartTime(defaultDate ? `${defaultDate}T09:00` : "");
      setEndTime(defaultDate ? `${defaultDate}T10:00` : "");
    }
  }, [editEvent, defaultDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) return;
    const payload = {
      title: title.trim(), description: description.trim(),
      project_id: projectId || null,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
    };
    if (editEvent) {
      await updateEvent.mutateAsync({ id: editEvent.id, ...payload });
    } else {
      await addEvent.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (editEvent) {
      await deleteEvent.mutateAsync(editEvent.id);
      onOpenChange(false);
    }
  };

  const isPending = addEvent.isPending || updateEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">{editEvent ? "Edit Event" : "Add Event"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none">
              <option value="">None</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Start *</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">End</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="flex-1 gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editEvent ? "Update" : "Create"} Event
            </button>
            {editEvent && (
              <button type="button" onClick={handleDelete} disabled={deleteEvent.isPending}
                className="px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
