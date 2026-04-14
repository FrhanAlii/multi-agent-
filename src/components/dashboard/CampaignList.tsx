import { Plus } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  leads: number;
  date: string;
  status: "active" | "done";
}

const mockCampaigns: Campaign[] = [
  { id: "1", name: "Series A Founders", leads: 45, date: "Mar 28, 2026", status: "active" },
  { id: "2", name: "SaaS VP Sales", leads: 120, date: "Mar 25, 2026", status: "active" },
  { id: "3", name: "Enterprise CROs", leads: 83, date: "Mar 20, 2026", status: "done" },
  { id: "4", name: "DevTool Leads", leads: 67, date: "Mar 15, 2026", status: "done" },
];

const statusStyles: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  done: "bg-success/10 text-success",
};

export function CampaignList() {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Campaigns</h3>
        <button className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors">
          <Plus className="w-3 h-3" /> New
        </button>
      </div>
      <ul className="space-y-3">
        {mockCampaigns.map((c) => (
          <li key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-secondary rounded-lg px-2 py-1.5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
              <p className="text-[11px] text-muted">{c.leads} leads · {c.date}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusStyles[c.status]}`}>
              {c.status === "active" ? "Active" : "Done"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
