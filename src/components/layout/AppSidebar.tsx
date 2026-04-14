import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare, LayoutDashboard, BarChart3, History, CalendarDays,
  CheckSquare, Settings, HelpCircle, LogOut, ChevronLeft, ChevronDown,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FileManager } from "@/components/sidebar/FileManager";

const menuItems = [
  { label: "AI Chat", icon: MessageSquare, path: "/chat" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tasks", icon: CheckSquare, path: "/tasks" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "History", icon: History, path: "/history" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
];

const generalItems = [
  { label: "Personalization", icon: Settings, path: "/personalization" },
  { label: "Help", icon: HelpCircle, path: "/help" },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [filesOpen, setFilesOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/signin");
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-40 transition-all duration-200 glass-sidebar ${collapsed ? "w-[68px]" : "w-[260px]"}`}>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </div>
        {!collapsed && <span className="text-lg font-bold text-primary">smartB AI</span>}
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {!collapsed && <p className="text-[11px] font-semibold text-muted uppercase tracking-[0.05em] px-3 mb-2">Menu</p>}
        <ul className="space-y-1">
          {menuItems.map(item => (
            <li key={item.path}>
              <Link to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                  isActive(item.path)
                    ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:rounded-full before:bg-primary"
                    : "text-foreground/70 hover:bg-secondary dark:hover:bg-white/[0.10] hover:text-foreground"
                }`}>
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {/* Files section */}
        {!collapsed && (
          <div className="mt-4">
            <button
              onClick={() => setFilesOpen(!filesOpen)}
              className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-[0.05em] w-full hover:text-foreground transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Files</span>
              <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${filesOpen ? "rotate-180" : ""}`} />
            </button>
            {filesOpen && (
              <div className="h-64 border border-border dark:border-white/[0.18] rounded-lg mt-1 overflow-hidden">
                <FileManager />
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          {!collapsed && <p className="text-[11px] font-semibold text-muted uppercase tracking-[0.05em] px-3 mb-2">General</p>}
          <ul className="space-y-1">
            {generalItems.map(item => (
              <li key={item.path}>
                <Link to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive(item.path) ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-secondary dark:hover:bg-white/[0.10] hover:text-foreground"
                  }`}>
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
            <li>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-secondary dark:hover:bg-white/[0.10] hover:text-foreground transition-all duration-150">
                <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>Logout</span>}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <button onClick={onToggle}
        className="absolute -right-3 top-8 w-6 h-6 bg-card dark:bg-white/[0.15] border border-border dark:border-white/[0.25] rounded-full flex items-center justify-center shadow-card hover:bg-secondary dark:hover:bg-white/[0.22] transition-colors">
        <ChevronLeft className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}
