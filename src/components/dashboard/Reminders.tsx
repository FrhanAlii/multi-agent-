import { Video } from "lucide-react";
import { useCalendarEvents, useUpdateEvent } from "@/hooks/useSupabaseData";
import { toast } from "@/hooks/use-toast";

export function Reminders() {
  const { data: events, isLoading } = useCalendarEvents();
  const updateEvent = useUpdateEvent();

  const nextEvent = events?.find((e) => e.status === "scheduled" && new Date(e.start_time) >= new Date(new Date().toDateString()));

  const handleStartMeeting = async () => {
    if (!nextEvent) return;
    await updateEvent.mutateAsync({ id: nextEvent.id, status: "started" });
    toast({ title: "Meeting started!" });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-card h-full animate-pulse">
        <div className="h-5 bg-secondary rounded w-24 mb-4" />
        <div className="h-6 bg-secondary rounded w-40 mb-2" />
        <div className="h-4 bg-secondary rounded w-32" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card h-full flex flex-col">
      <h3 className="text-base font-semibold text-foreground mb-4">Reminders</h3>
      <div className="flex-1">
        {nextEvent ? (
          <>
            <p className="text-lg font-bold text-foreground mb-1">{nextEvent.title}</p>
            <p className="text-sm text-muted mb-6">
              Time: {new Date(nextEvent.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              {nextEvent.end_time ? ` - ${new Date(nextEvent.end_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted mb-6">No upcoming events</p>
        )}
      </div>
      <button onClick={handleStartMeeting} disabled={!nextEvent || updateEvent.isPending}
        className="w-full gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
        <Video className="w-4 h-4" />
        Start Meeting
      </button>
    </div>
  );
}
