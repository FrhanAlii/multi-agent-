import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Project {
  id: string; name: string; description: string; status: string;
  color: string; owner_id: string; created_at: string; due_date: string | null;
}
export interface Task {
  id: string; title: string; description: string; project_id: string | null;
  assignee_id: string | null; status: string; priority: string;
  due_date: string | null; created_at: string; user_id: string;
}
export interface IncomeEntry {
  id: string; project_id: string | null; user_id: string; amount: number;
  source: string; description: string; date: string; created_at: string;
}
export interface ExpenseEntry {
  id: string; project_id: string | null; user_id: string; amount: number;
  category: string; description: string; date: string; created_at: string;
}
export interface Budget {
  id: string; project_id: string | null; category: string;
  allocated_amount: number; period: string; user_id: string; created_at: string;
}
export interface ProjectMember {
  id: string; project_id: string | null; user_id: string;
  role: string; name: string; email: string; created_at: string;
}
export interface CalendarEvent {
  id: string; title: string; description: string; project_id: string | null;
  start_time: string; end_time: string | null; user_id: string;
  status: string; created_at: string;
}
export interface TimeLog {
  id: string; task_id: string | null; user_id: string;
  started_at: string; ended_at: string | null; duration_seconds: number;
}

// ---- PROJECTS ----
export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Project[];
    },
    enabled: !!user,
  });
}

export function useAddProject() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: { name: string; description: string; status: string; color: string; due_date: string | null }) => {
      const { error } = await supabase.from("projects").insert({ ...p, owner_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast({ title: "Project created successfully" }); },
    onError: (e: Error) => toast({ title: "Error creating project", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast({ title: "Project deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ---- TASKS ----
export function useTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        qc.invalidateQueries({ queryKey: ["tasks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Task[];
    },
    enabled: !!user,
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (t: { title: string; description: string; project_id: string | null; assignee_id: string | null; status: string; priority: string; due_date: string | null }) => {
      const { error } = await supabase.from("tasks").insert({ ...t, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast({ title: "Task created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("tasks").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e: Error) => toast({ title: "Error updating task", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast({ title: "Task deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ---- INCOME ----
export function useIncomeEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income_entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("income_entries").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data as unknown as IncomeEntry[];
    },
    enabled: !!user,
  });
}

export function useAddIncome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: { project_id: string | null; amount: number; source: string; description: string; date: string }) => {
      const { error } = await supabase.from("income_entries").insert({ ...entry, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["income_entries"] }); toast({ title: "Income added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["income_entries"] }); toast({ title: "Income deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ---- EXPENSES ----
export function useExpenseEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expense_entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_entries").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data as unknown as ExpenseEntry[];
    },
    enabled: !!user,
  });
}

export function useAddExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: { project_id: string | null; amount: number; category: string; description: string; date: string }) => {
      const { error } = await supabase.from("expense_entries").insert({ ...entry, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_entries"] }); toast({ title: "Expense added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_entries"] }); toast({ title: "Expense deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ---- BUDGETS ----
export function useBudgets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Budget[];
    },
    enabled: !!user,
  });
}

export function useAddBudget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (b: { project_id: string | null; category: string; allocated_amount: number; period: string }) => {
      const { error } = await supabase.from("budgets").insert({ ...b, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); toast({ title: "Budget added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ---- MEMBERS ----
export function useProjectMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_members").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProjectMember[];
    },
    enabled: !!user,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (m: { project_id: string | null; role: string; name: string; email: string }) => {
      const { error } = await supabase.from("project_members").insert({ ...m, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project_members"] }); toast({ title: "Member added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project_members"] }); toast({ title: "Member removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ---- CALENDAR EVENTS ----
export function useCalendarEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar_events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").order("start_time", { ascending: true });
      if (error) throw error;
      return data as unknown as CalendarEvent[];
    },
    enabled: !!user,
  });
}

export function useAddEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (e: { title: string; description: string; project_id: string | null; start_time: string; end_time: string | null }) => {
      const { error } = await supabase.from("calendar_events").insert({ ...e, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar_events"] }); toast({ title: "Event created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("calendar_events").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar_events"] }); toast({ title: "Event updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar_events"] }); toast({ title: "Event deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ---- TIME LOGS ----
export function useTimeLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["time_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_logs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as TimeLog[];
    },
    enabled: !!user,
  });
}

export function useAddTimeLog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (log: { started_at: string; task_id?: string | null }) => {
      const { data, error } = await supabase.from("time_logs").insert({ ...log, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data as unknown as TimeLog;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time_logs"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; ended_at?: string; duration_seconds?: number }) => {
      const { error } = await supabase.from("time_logs").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time_logs"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
