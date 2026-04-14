import { Pause, Square, Play } from "lucide-react";
import { useTimeTracker } from "@/contexts/TimeTrackerContext";

export function TimeTracker() {
  const { running, seconds, start, pause, stop } = useTimeTracker();

  const format = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="gradient-primary rounded-2xl p-5 shadow-card h-full flex flex-col justify-between text-primary-foreground">
      <h3 className="text-base font-semibold text-primary-foreground/80">Time Tracker</h3>
      <p className="text-4xl font-mono font-semibold tracking-wider text-center my-4">{format(seconds)}</p>
      <div className="flex justify-center gap-3">
        {!running && seconds === 0 ? (
          <button onClick={start}
            className="w-12 h-12 rounded-full bg-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
            <Play className="w-5 h-5 text-primary" />
          </button>
        ) : (
          <button onClick={running ? pause : start}
            className="w-12 h-12 rounded-full bg-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
            {running ? <Pause className="w-5 h-5 text-primary" /> : <Play className="w-5 h-5 text-primary" />}
          </button>
        )}
        <button onClick={stop}
          className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 transition-opacity">
          <Square className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}
