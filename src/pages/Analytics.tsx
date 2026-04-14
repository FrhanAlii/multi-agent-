import { useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { TrendingUp, DollarSign, Activity, Briefcase } from "lucide-react";
import { useIncomeEntries, useExpenseEntries, useTasks, useProjects } from "@/hooks/useSupabaseData";

export default function Analytics() {
  const { data: income } = useIncomeEntries();
  const { data: expenses } = useExpenseEntries();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();

  const totalIncome = useMemo(() => (income ?? []).reduce((s, e) => s + Number(e.amount), 0), [income]);
  const totalExpenses = useMemo(() => (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const netProfit = totalIncome - totalExpenses;
  const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((month, i) => ({
      month,
      revenue: (income ?? []).filter((e) => new Date(e.date).getMonth() === i).reduce((s, e) => s + Number(e.amount), 0),
      spending: (expenses ?? []).filter((e) => new Date(e.date).getMonth() === i).reduce((s, e) => s + Number(e.amount), 0),
    }));
  }, [income, expenses]);

  const completionData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month) => {
      const total = tasks?.length || 1;
      const done = tasks?.filter((t) => t.status === "done").length || 0;
      return { month, rate: Math.round((done / total) * 100) };
    });
  }, [tasks]);

  const spendingBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    (expenses ?? []).forEach((e) => { const c = e.category || "Other"; cats[c] = (cats[c] || 0) + Number(e.amount); });
    const colors = ["hsl(153,48%,19%)", "hsl(153,38%,36%)", "hsl(152,36%,52%)", "hsl(153,48%,19%,0.3)"];
    return Object.entries(cats).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [expenses]);

  const stats = [
    { label: "Total Income", value: `$${totalIncome.toLocaleString()}`, icon: DollarSign, change: "+12%" },
    { label: "Total Spending", value: `$${totalExpenses.toLocaleString()}`, icon: TrendingUp, change: "-3%" },
    { label: "Net Profit", value: `$${netProfit.toLocaleString()}`, icon: Activity, change: "+18%" },
    { label: "Active Projects", value: String(activeProjects), icon: Briefcase, change: `${activeProjects}` },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted mt-1">Track your performance and financial metrics.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-success">{s.change}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-8 bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Revenue vs Spending</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220,9%,46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(220,9%,46%)" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(153,48%,19%)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="spending" stroke="hsl(29,88%,67%)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-4 bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Spending Breakdown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendingBreakdown.length > 0 ? spendingBreakdown : [{ name: "None", value: 1, color: "hsl(220,13%,91%)" }]}
                  cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {(spendingBreakdown.length > 0 ? spendingBreakdown : [{ color: "hsl(220,13%,91%)" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {spendingBreakdown.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-muted">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card rounded-2xl p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Project Completion Rate</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220,9%,46%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220,9%,46%)" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="rate" stroke="hsl(153,48%,19%)" fill="hsl(153,48%,19%,0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
