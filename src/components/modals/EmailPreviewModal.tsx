import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Lead {
  name: string;
  company: string;
  subject?: string;
  emailBody?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function EmailPreviewModal({ open, onOpenChange, lead }: Props) {
  if (!lead) return null;

  const handleCopy = () => {
    const text = `Subject: ${lead.subject}\n\n${lead.emailBody}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Email copied to clipboard!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{lead.name}</span>
            <span className="text-sm font-normal text-muted">at {lead.company}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Subject</p>
            <p className="text-sm font-medium text-foreground bg-secondary rounded-lg px-3 py-2">{lead.subject || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Email Body</p>
            <div className="text-sm text-foreground bg-secondary rounded-lg px-3 py-3 whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto">
              {lead.emailBody || "No email generated yet."}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="flex-1 gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Copy className="w-4 h-4" /> Copy Email
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
