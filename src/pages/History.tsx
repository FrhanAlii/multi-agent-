import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trash2, MessageSquare, ExternalLink, ArrowUpDown } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, deleteConversation } = useConversations();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("chat_messages")
      .select("conversation_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((row: { conversation_id: string }) => {
          counts[row.conversation_id] = (counts[row.conversation_id] || 0) + 1;
        });
        setMessageCounts(counts);
      });
  }, [user]);

  const toggleSort = (field: "date" | "title") => {
    if (sortBy === field) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const filtered = conversations
    .filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "title") {
        return sortDir === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      const da = new Date(a.last_message_at).getTime();
      const db = new Date(b.last_message_at).getTime();
      return sortDir === "asc" ? da - db : db - da;
    });

  const handleOpen = (id: string) => {
    navigate(`/chat?conversation=${id}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">History</h1>
        <p className="text-sm text-muted mt-1">All your past conversations</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-secondary pl-10 pr-4 py-2 rounded-xl text-sm text-foreground placeholder:text-muted border-none outline-none focus:ring-2 focus:ring-primary/20 w-full"
          />
        </div>
        <button
          onClick={() => toggleSort("date")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
            sortBy === "date" ? "bg-primary/10 text-primary font-medium" : "bg-secondary text-foreground/70 hover:text-foreground"
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Date {sortBy === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
        </button>
        <button
          onClick={() => toggleSort("title")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
            sortBy === "title" ? "bg-primary/10 text-primary font-medium" : "bg-secondary text-foreground/70 hover:text-foreground"
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Title {sortBy === "title" ? (sortDir === "desc" ? "↓" : "↑") : ""}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {search ? "No conversations found" : "No conversations yet"}
          </h3>
          <p className="text-sm text-muted">
            {search ? "Try a different search term" : "Start a chat to see your history here"}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-260px)]">
          <div className="space-y-2">
            {filtered.map(c => (
              <div
                key={c.id}
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted">
                      {new Date(c.last_message_at).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted">
                      {messageCounts[c.id] ?? 0} message{(messageCounts[c.id] ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpen(c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <button
                    onClick={() => deleteConversation(c.id)}
                    className="p-1.5 rounded-lg text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
