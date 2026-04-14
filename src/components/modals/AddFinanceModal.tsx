import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddIncome, useAddExpense, useProjects } from "@/hooks/useSupabaseData";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "income" | "expense";
}

export function AddFinanceModal({ open, onOpenChange, type }: Props) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const addIncome = useAddIncome();
  const addExpense = useAddExpense();
  const { data: projects } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    if (type === "income") {
      await addIncome.mutateAsync({
        amount: parsedAmount, source: source.trim(), description: description.trim(),
        date, project_id: projectId || null,
      });
    } else {
      await addExpense.mutateAsync({
        amount: parsedAmount, category: category.trim(), description: description.trim(),
        date, project_id: projectId || null,
      });
    }
    setAmount(""); setSource(""); setCategory(""); setProjectId(""); setDescription("");
    onOpenChange(false);
  };

  const isPending = addIncome.isPending || addExpense.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add {type === "income" ? "Income" : "Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Amount *</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          {type === "income" ? (
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Source</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={200}
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={200}
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none">
                <option value="">None</option>
                {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <button type="submit" disabled={isPending}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Add {type === "income" ? "Income" : "Expense"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
