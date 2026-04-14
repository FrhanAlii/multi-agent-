import { Bell, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function TopBar() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
    setTheme(next);
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "auto" ? Monitor : Sun;

  return (
    <header className="h-16 border-b border-border bg-card glass flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          className="p-2 rounded-xl hover:bg-secondary dark:hover:bg-white/[0.12] transition-colors"
        >
          <ThemeIcon className="w-5 h-5 text-muted" />
        </button>
        <button className="relative p-2 rounded-xl hover:bg-secondary dark:hover:bg-white/[0.12] transition-colors">
          <Bell className="w-5 h-5 text-muted" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-3 ml-2">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            AI
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-foreground leading-tight">smartB AI</p>
            <p className="text-[11px] text-muted">Sales Automation</p>
          </div>
        </div>
      </div>
    </header>
  );
}
