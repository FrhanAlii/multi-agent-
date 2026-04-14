import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TimeTrackerState {
  running: boolean;
  seconds: number;
  currentLogId: string | null;
  start: () => void;
  pause: () => void;
  stop: () => void;
}

const TimeTrackerContext = createContext<TimeTrackerState>({
  running: false, seconds: 0, currentLogId: null,
  start: () => {}, pause: () => {}, stop: () => {},
});

export const useTimeTracker = () => useContext(TimeTrackerContext);

export function TimeTrackerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const start = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    startedAtRef.current = now;
    const { data, error } = await supabase.from("time_logs")
      .insert({ started_at: now, user_id: user.id, duration_seconds: 0 } as any)
      .select().single();
    if (error) { toast({ title: "Error starting timer", description: error.message, variant: "destructive" }); return; }
    setCurrentLogId((data as any).id);
    setRunning(true);
    setSeconds(0);
  };

  const pause = async () => {
    setRunning(false);
    if (currentLogId) {
      await supabase.from("time_logs").update({ duration_seconds: seconds } as any).eq("id", currentLogId);
    }
  };

  const stop = async () => {
    setRunning(false);
    if (currentLogId) {
      await supabase.from("time_logs").update({
        ended_at: new Date().toISOString(),
        duration_seconds: seconds,
      } as any).eq("id", currentLogId);
      toast({ title: "Time logged", description: `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s` });
    }
    setCurrentLogId(null);
    setSeconds(0);
  };

  return (
    <TimeTrackerContext.Provider value={{ running, seconds, currentLogId, start, pause, stop }}>
      {children}
    </TimeTrackerContext.Provider>
  );
}
