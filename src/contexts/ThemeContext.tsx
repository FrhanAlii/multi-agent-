import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePersonalization } from "@/hooks/usePersonalization";

interface ThemeContextType {
  theme: string;
  setTheme: (t: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "light", setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // "auto" — match system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, setSettings, save } = usePersonalization();

  useEffect(() => {
    if (!settings.theme) return;
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen to system preference changes when theme is "auto"
  useEffect(() => {
    if (settings.theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.theme]);

  const setTheme = (t: string) => {
    const updated = { ...settings, theme: t };
    setSettings(updated);
    save(updated);
    localStorage.setItem("theme", t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme: settings.theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
