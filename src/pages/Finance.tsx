import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Plus, DollarSign, TrendingUp, TrendingDown, Wallet, Trash2, Loader2 } from "lucide-react";
import { useIncomeEntries, useExpenseEntries, useBudgets, useDeleteIncome, useDeleteExpense, useProjects, useAddBudget } from "@/hooks/useSupabaseData";
import { AddFinanceModal } from "@/components/modals/AddFinanceModal";

const tabs = ["Overview", "Income", "Expenses", "Budget"];

export default function Finance() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { data: income, isLoading: loadingIncome } = useIncomeEntries();
  const { data: expenses, isLoading: loadingExpenses } = useExpenseEntries();
  const { data: budgets } = useBudgets();
  const { data: projects } = useProjects();
  const deleteIncome = useDeleteIncome();
  const deleteExpense = useDeleteExpense();
  const addBudget = useAddBudget();

  const totalIncome = useMemo(() => (income ?? []).reduce((s, e) => s + Number(e.amount), 0), [income]);
  const totalExpenses = useMemo(() => (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month, i) => ({
      month,
      income: (income ?? []).filter((e) => new Date(e.date).getMonth() === i).reduce((s, e) => s + Number(e.amount), 0),
      expenses: (expenses ?? []).filter((e) => new Date(e.date).getMonth() === i).reduce((s, e) => s + Number(e.amount), 0),
    }));
  }, [income, expenses]);

  const getProjectName = (pid: string | null) => projects?.find((p) => p.id === pid)?.name || "—";

  const budgetWithSpend = useMemo(() => {
    return (budgets ?? []).map((b) => {
      const spent = (expenses ?? []).filter((e) => e.category === b.category).reduce((s, e) => s + Number(e.amount), 0);
      return { ...b, used: spent };
    });
  }, [budgets, expenses]);

  if (loadingIncome || loadingExpenses) {
    return <div className="max-w-[1200px] mx-auto"><div className="h-96 animate-pulse bg-card rounded-2xl" /></div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-sm text-muted mt-1">Track income, expenses, and budgets.</p>
        </div>
      </div>
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-card shadow-card text-foreground" : "text-muted hover:text-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-2xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Wallet className="w-5 h-5 text-primary" /></div>
              <p className="text-2xl font-bold text-foreground">${(totalIncome - totalExpenses).toLocaleString()}</p>
              <p className="text-xs text-muted mt-1">Current Balance</p>
            </div>
            <div className="bg-card rounded-2xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-success" /></div>
              <p className="text-2xl font-bold text-foreground">${totalIncome.toLocaleString()}</p>
              <p className="text-xs text-muted mt-1">Total Income</p>
            </div>
            <div className="bg-card rounded-2xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3"><TrendingDown className="w-5 h-5 text-warning" /></div>
              <p className="text-2xl font-bold text-foreground">${totalExpenses.toLocaleString()}</p>
              <p className="text-xs text-muted mt-1">Total Expenses</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-card mb-4">
            <h3 className="text-base font-semibold text-foreground mb-4">Income vs Expenses</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220,9%,46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220,9%,46%)" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="income" fill="hsl(153,48%,19%)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(29,88%,67%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <h3 className="text-base font-semibold text-foreground mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {[...(income ?? []).map((e) => ({ ...e, type: "income" as const })), ...(expenses ?? []).map((e) => ({ ...e, type: "expense" as const }))]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 8)
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.type === "income" ? "bg-success/10" : "bg-warning/10"}`}>
                        <DollarSign className={`w-4 h-4 ${t.type === "income" ? "text-success" : "text-warning"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.description || (t.type === "income" ? (t as any).source : (t as any).category)}</p>
                        <p className="text-[11px] text-muted">{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === "income" ? "text-success" : "text-warning"}`}>
                      {t.type === "income" ? "+" : "-"}${Number(t.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "Budget" && (
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Budget Allocation</h3>
          <div className="space-y-5">
            {budgetWithSpend.map((b) => {
              const pct = Number(b.allocated_amount) > 0 ? Math.round((b.used / Number(b.allocated_amount)) * 100) : 0;
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{b.category}</p>
                    <p className="text-xs text-muted">${b.used.toLocaleString()} / ${Number(b.allocated_amount).toLocaleString()}</p>
                  </div>
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
            {budgetWithSpend.length === 0 && <p className="text-sm text-muted text-center py-4">No budgets set yet</p>}
          </div>
        </div>
      )}

      {(activeTab === "Income" || activeTab === "Expenses") && (
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">{activeTab} Entries</h3>
            <button onClick={() => activeTab === "Income" ? setShowIncomeModal(true) : setShowExpenseModal(true)}
              className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Add {activeTab === "Income" ? "Income" : "Expense"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-xs font-semibold text-muted">Date</th>
                  <th className="text-left py-3 text-xs font-semibold text-muted">Description</th>
                  <th className="text-left py-3 text-xs font-semibold text-muted">{activeTab === "Income" ? "Source" : "Category"}</th>
                  <th className="text-left py-3 text-xs font-semibold text-muted">Project</th>
                  <th className="text-right py-3 text-xs font-semibold text-muted">Amount</th>
                  <th className="text-right py-3 text-xs font-semibold text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === "Income" ? income : expenses)?.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="py-3 text-muted">{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="py-3 text-foreground font-medium">{entry.description}</td>
                    <td className="py-3 text-muted">{entry.source || entry.category || "—"}</td>
                    <td className="py-3 text-muted">{getProjectName(entry.project_id)}</td>
                    <td className="py-3 text-right font-semibold">${Number(entry.amount).toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => activeTab === "Income" ? deleteIncome.mutate(entry.id) : deleteExpense.mutate(entry.id)}
                        className="text-destructive hover:text-destructive/80 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddFinanceModal open={showIncomeModal} onOpenChange={setShowIncomeModal} type="income" />
      <AddFinanceModal open={showExpenseModal} onOpenChange={setShowExpenseModal} type="expense" />
    </div>
  );
}
