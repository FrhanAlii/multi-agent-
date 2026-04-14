import { useState } from "react";
import { Eye } from "lucide-react";
import { EmailPreviewModal } from "@/components/modals/EmailPreviewModal";

type LeadStatus = "queued" | "researching" | "drafting" | "done" | "failed";

interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  status: LeadStatus;
  subject?: string;
  emailBody?: string;
}

const statusStyles: Record<LeadStatus, string> = {
  queued: "bg-muted/20 text-muted",
  researching: "bg-blue-500/10 text-blue-500",
  drafting: "bg-warning/10 text-warning",
  done: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<LeadStatus, string> = {
  queued: "Queued",
  researching: "Researching",
  drafting: "Drafting",
  done: "Done",
  failed: "Failed",
};

const mockLeads: Lead[] = [
  { id: "1", name: "John Smith", company: "Stripe", role: "VP of Sales", status: "done", subject: "Scaling Stripe's outbound — a thought", emailBody: "Hi John,\n\nI noticed Stripe recently expanded its sales team by 40% this quarter. Scaling outbound at that pace is no small feat — especially when personalization matters as much as volume.\n\nAt smartB AI, we help sales teams like yours automate personalized cold outreach using AI agents that research each prospect and craft tailored emails. Our customers typically see a 3x improvement in reply rates.\n\nWould you be open to a quick 15-minute call next week to explore if this could help your team?\n\nBest,\nAlex" },
  { id: "2", name: "Sarah Chen", company: "Notion", role: "Head of Growth", status: "done", subject: "Notion's growth engine + AI outreach", emailBody: "Hi Sarah,\n\nI've been following Notion's incredible product-led growth story. As you scale into enterprise, outbound becomes a critical channel — but doing it well at scale is tough.\n\nsmartB AI uses AI agents to research each lead and write hyper-personalized cold emails automatically. It's like having 50 SDRs who never sleep.\n\nWould love to show you a quick demo. Free next Tuesday?\n\nCheers,\nAlex" },
  { id: "3", name: "Mike Johnson", company: "Figma", role: "CRO", status: "drafting" },
  { id: "4", name: "Emily Davis", company: "Linear", role: "Director of Ops", status: "researching" },
  { id: "5", name: "Alex Rivera", company: "Vercel", role: "Sales Lead", status: "queued" },
];

export function LeadsPipeline() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full">
      <h3 className="text-base font-semibold text-foreground mb-4">Leads Pipeline</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-[11px] font-semibold text-muted">Lead</th>
              <th className="text-left py-2 text-[11px] font-semibold text-muted">Company</th>
              <th className="text-left py-2 text-[11px] font-semibold text-muted">Role</th>
              <th className="text-left py-2 text-[11px] font-semibold text-muted">Status</th>
              <th className="text-right py-2 text-[11px] font-semibold text-muted">Action</th>
            </tr>
          </thead>
          <tbody>
            {mockLeads.map((lead) => {
              const initials = lead.name.split(" ").map((w) => w[0]).join("").toUpperCase();
              return (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <span className="font-medium text-foreground">{lead.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted">{lead.company}</td>
                  <td className="py-3 text-muted">{lead.role}</td>
                  <td className="py-3">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusStyles[lead.status]}`}>
                      {statusLabels[lead.status]}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedLead(lead)}
                      disabled={lead.status !== "done"}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-4 h-4 text-muted" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <EmailPreviewModal
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        lead={selectedLead}
      />
    </div>
  );
}
