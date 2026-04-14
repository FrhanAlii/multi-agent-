import { useEffect, useState } from "react";
import { Bot, MessageSquare, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { StatCards } from "@/components/dashboard/StatCards";

export default function Dashboard() {
  const { user } = useAuth();
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [stats, setStats] = useState({ conversations: 0, messages: 0, files: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: convs }, { data: msgs }, { data: files }] = await Promise.all([
        supabase.from("conversations").select("*").eq("user_id", user.id).order("last_message_at", { ascending: false }).limit(5),
        supabase.from("chat_messages").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("user_files").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);
      setRecentChats(convs || []);
      setStats({
        conversations: convs?.length || 0,
        messages: msgs?.length || 0,
        files: files?.length || 0,
      });
    })();
  }, [user]);

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted mt-1">Your AI-first productivity hub</p>
        </div>
        <Link to="/chat" className="gradient-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity w-fit">
          <MessageSquare className="w-4 h-4" /> Open AI Chat
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Conversations", value: stats.conversations, icon: MessageSquare, color: "text-primary" },
          { label: "Messages Sent", value: stats.messages, icon: Zap, color: "text-accent" },
          { label: "Files Uploaded", value: stats.files, icon: TrendingUp, color: "text-warning" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Insights */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" /> AI Insights
          </h3>
          <div className="space-y-3">
            <div className="bg-primary/5 rounded-lg p-3">
              <p className="text-xs text-foreground/80">Your AI assistant is ready. Start a conversation to get personalized help with tasks, analysis, and more.</p>
            </div>
            <Link to="/personalization" className="block text-xs text-primary hover:underline">
              → Customize your AI experience in Personalization settings
            </Link>
          </div>
        </div>

        {/* Recent conversations */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Recent Conversations
          </h3>
          <div className="space-y-2">
            {recentChats.map(c => (
              <Link key={c.id} to="/chat" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                <MessageSquare className="w-3.5 h-3.5 text-muted" />
                <span className="text-sm text-foreground truncate flex-1">{c.title}</span>
                <span className="text-[10px] text-muted">{new Date(c.last_message_at).toLocaleDateString()}</span>
              </Link>
            ))}
            {recentChats.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No conversations yet. <Link to="/chat" className="text-primary hover:underline">Start one!</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
