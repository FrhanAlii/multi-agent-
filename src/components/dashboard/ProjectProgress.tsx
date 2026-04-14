import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Done", value: 142, color: "hsl(152,36%,52%)" },
  { name: "Processing", value: 23, color: "hsl(153,48%,19%)" },
  { name: "Queued", value: 83, color: "hsl(153,48%,19%,0.15)" },
];

const total = data.reduce((s, d) => s + d.value, 0);
const pct = Math.round((data[0].value / total) * 100);

export function ProjectProgress() {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full flex flex-col items-center">
      <h3 className="text-base font-semibold text-foreground self-start mb-2">Lead Progress</h3>
      <div className="w-40 h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={70}
              startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{pct}%</span>
          <span className="text-[10px] text-muted">Completed</span>
        </div>
      </div>
      <div className="flex gap-4 mt-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] text-muted">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
