import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCalendarEvents, useTasks, type CalendarEvent } from "@/hooks/useSupabaseData";
import { AddEventModal } from "@/components/modals/AddEventModal";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const { data: events, isLoading } = useCalendarEvents();
  const { data: tasks } = useTasks();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsMap = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events?.forEach((e) => {
      const d = new Date(e.start_time);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    });
    return map;
  }, [events, month, year]);

  const upcomingTasks = (tasks ?? []).filter((t) => t.due_date && t.status !== "done").slice(0, 5);

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = eventsMap[day];
    if (dayEvents && dayEvents.length > 0) {
      setEditEvent(dayEvents[0]);
      setSelectedDate("");
    } else {
      setSelectedDate(dateStr);
      setEditEvent(null);
    }
    setShowModal(true);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted mt-1">Schedule and manage your outreach campaigns.</p>
        </div>
        <button onClick={() => { setEditEvent(null); setSelectedDate(new Date().toISOString().split("T")[0]); setShowModal(true); }}
          className="gradient-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-secondary transition-colors"><ChevronLeft className="w-5 h-5 text-muted" /></button>
            <h2 className="text-lg font-semibold text-foreground">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-secondary transition-colors"><ChevronRight className="w-5 h-5 text-muted" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-muted py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const hasEvent = day ? eventsMap[day] : null;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div key={i} onClick={() => day && handleDayClick(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm cursor-pointer transition-colors ${
                    day ? "hover:bg-secondary" : ""
                  } ${isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"}`}>
                  {day && (
                    <>
                      <span>{day}</span>
                      {hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Upcoming Tasks</h3>
          <ul className="space-y-4">
            {upcomingTasks.map((t) => (
              <li key={t.id} className="border-l-2 border-primary pl-3">
                <p className="text-sm font-medium text-foreground">{t.title}</p>
                <p className="text-[11px] text-muted">{t.due_date ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</p>
              </li>
            ))}
            {upcomingTasks.length === 0 && <p className="text-sm text-muted">No upcoming tasks</p>}
          </ul>
        </div>
      </div>
      <AddEventModal open={showModal} onOpenChange={setShowModal} defaultDate={selectedDate} editEvent={editEvent} />
    </div>
  );
}
