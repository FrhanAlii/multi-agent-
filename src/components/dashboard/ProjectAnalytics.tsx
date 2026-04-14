import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useTasks } from "@/hooks/useSupabaseData";

export function ProjectAnalytics() {
  const { data: tasks, isLoading } = useTasks();

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  tasks?.forEach((t) => {
    const day = new Date(t.created_at).getDay();
    dayCounts[day]++;
  });

  const chartData = dayNames.map((name, i) => ({ day: name, value: dayCounts[i] }));
  const maxIdx = chartData.reduce((max, d, i) => (d.value > chartData[max].value ? i : max), 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-card h-full animate-pulse">
        <div className="h-5 bg-secondary rounded w-36 mb-4" />
        <div className="h-48 bg-secondary rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full">
      <h3 className="text-base font-semibold text-foreground mb-4">Project Analytics</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="25%">
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220,9%,46%)" }} />
            <Tooltip />
            <Bar dataKey="value" radius={[999, 999, 999, 999]} maxBarSize={32}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === maxIdx ? "hsl(153,48%,19%)" : "hsl(153,48%,19%,0.15)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center mt-2">
        <span className="text-xs text-muted">
          Peak: <span className="font-semibold text-primary">{chartData[maxIdx]?.value || 0}</span> tasks on {chartData[maxIdx]?.day}
        </span>
      </div>
    </div>
  );
}
