import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Play } from "lucide-react";

interface Lead {
  name: string;
  company: string;
  role: string;
  linkedin: string;
  email: string;
}

const mockLeads: Lead[] = [
  { name: "John Smith", company: "Stripe", role: "VP of Sales", linkedin: "linkedin.com/in/johnsmith", email: "john@stripe.com" },
  { name: "Sarah Chen", company: "Notion", role: "Head of Growth", linkedin: "linkedin.com/in/sarahchen", email: "sarah@notion.so" },
  { name: "Mike Johnson", company: "Figma", role: "CRO", linkedin: "linkedin.com/in/mikej", email: "mike@figma.com" },
  { name: "Emily Davis", company: "Linear", role: "Director of Ops", linkedin: "linkedin.com/in/emilyd", email: "emily@linear.app" },
  { name: "Alex Rivera", company: "Vercel", role: "Sales Lead", linkedin: "linkedin.com/in/alexr", email: "alex@vercel.com" },
];

export function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) {
      setFile(dropped);
      setLeads(mockLeads);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.name.endsWith(".csv")) {
      setFile(selected);
      setLeads(mockLeads);
    }
  };

  const handleSimulate = () => {
    if (!file) {
      setFile(new File([""], "sample_leads.csv"));
      setLeads(mockLeads);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full">
      <h3 className="text-base font-semibold text-foreground mb-4">Upload Leads</h3>

      {leads.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={handleSimulate}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <Upload className="w-8 h-8 text-muted mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Drop your CSV here</p>
          <p className="text-[11px] text-muted">or click to browse</p>
          <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground font-medium">{file?.name}</span>
            <span className="text-[11px] text-muted ml-auto">{leads.length} leads</span>
          </div>
          <div className="overflow-auto max-h-36 rounded-lg border border-border">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-2 py-1.5 font-semibold text-muted">Name</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-muted">Company</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-muted">Role</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-muted">Email</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1.5 text-foreground">{l.name}</td>
                    <td className="px-2 py-1.5 text-foreground">{l.company}</td>
                    <td className="px-2 py-1.5 text-muted">{l.role}</td>
                    <td className="px-2 py-1.5 text-muted">{l.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="w-full gradient-primary text-primary-foreground rounded-xl py-3 mt-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Play className="w-4 h-4" /> Run AI Agent
          </button>
          <p className="text-[10px] text-muted text-center mt-2">Agent will research, draft, and review each lead automatically</p>
        </>
      )}
    </div>
  );
}
