import { useState } from "react";
import { Plus, Filter } from "lucide-react";
import { useTasks, useUpdateTask, useProjects } from "@/hooks/useSupabaseData";
import { AddTaskModal } from "@/components/modals/AddTaskModal";

const columns = [
  { id: "todo", label: "To Do", color: "bg-muted/30" },
  { id: "inprogress", label: "In Progress", color: "bg-primary/10" },
  { id: "review", label: "In Review", color: "bg-warning/10" },
  { id: "done", label: "Completed", color: "bg-success/10" },
];

const priorityStyles: Record<string, string> = {
  low: "bg-muted/20 text-muted",
  medium: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

export default function Tasks() {
  const { data: tasks, isLoading } = useTasks();
  const { data: projects } = useProjects();
  const updateTask = useUpdateTask();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleDrop = (status: string) => {
    if (!draggedTask) return;
    updateTask.mutate({ id: draggedTask, status });
    setDraggedTask(null);
  };

  const getProjectName = (pid: string | null) => projects?.find((p) => p.id === pid)?.name || "";

  if (isLoading) {
    return <div className="max-w-[1200px] mx-auto"><div className="h-96 animate-pulse bg-card rounded-2xl" /></div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted mt-1">Manage and track your sales leads pipeline.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-card text-foreground border border-border rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-secondary transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button onClick={() => setShowModal(true)} className="gradient-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = (tasks ?? []).filter((t) => t.status === col.id);
          return (
            <div key={col.id} className={`rounded-2xl p-4 ${col.color} min-h-[300px]`}
              onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                <span className="text-xs text-muted bg-card px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-3">
                {colTasks.map((task) => (
                  <div key={task.id} draggable onDragStart={() => setDraggedTask(task.id)}
                    className="bg-card rounded-xl p-4 shadow-card cursor-grab active:cursor-grabbing hover:shadow-elevated transition-shadow">
                    <p className="text-sm font-semibold text-foreground mb-2">{task.title}</p>
                    <p className="text-[11px] text-muted mb-3">{getProjectName(task.project_id)}</p>
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold">
                        You
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityStyles[task.priority] || ""}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </div>
                    {task.due_date && <p className="text-[10px] text-muted mt-2">Due: {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <AddTaskModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
