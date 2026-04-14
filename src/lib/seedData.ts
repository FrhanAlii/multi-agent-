import { supabase } from "@/integrations/supabase/client";

export async function seedDataIfEmpty(userId: string) {
  const { data: existing } = await supabase.from("projects").select("id").limit(1);
  if (existing && existing.length > 0) return;

  // Seed projects
  const projectColors = ["#1a4731", "#2d6a4f", "#40916c", "#52b788", "#e63946"];
  const projectData = [
    { name: "Website Redesign", description: "Complete overhaul of company website", status: "active", color: projectColors[0], due_date: "2026-04-15" },
    { name: "API Project", description: "Build REST API endpoints", status: "active", color: projectColors[1], due_date: "2026-04-01" },
    { name: "Mobile App", description: "Cross-platform mobile application", status: "active", color: projectColors[2], due_date: "2026-05-01" },
    { name: "Dashboard V2", description: "Analytics dashboard rebuild", status: "ended", color: projectColors[3], due_date: "2026-03-01" },
    { name: "DevOps Pipeline", description: "CI/CD and infrastructure", status: "pending", color: projectColors[4], due_date: "2026-06-01" },
  ].map((p) => ({ ...p, owner_id: userId }));

  const { data: projects } = await supabase.from("projects").insert(projectData as any).select();
  if (!projects || projects.length === 0) return;

  const pIds = (projects as any[]).map((p: any) => p.id);

  // Seed tasks
  const taskData = [
    { title: "Design landing page mockup", project_id: pIds[0], status: "todo", priority: "high", due_date: "2026-04-01" },
    { title: "Setup CI/CD pipeline", project_id: pIds[4], status: "todo", priority: "urgent", due_date: "2026-03-28" },
    { title: "Implement user auth", project_id: pIds[1], status: "inprogress", priority: "high", due_date: "2026-03-30" },
    { title: "Write unit tests", project_id: pIds[1], status: "inprogress", priority: "medium", due_date: "2026-04-03" },
    { title: "Code review PR #42", project_id: pIds[3], status: "review", priority: "low", due_date: "2026-04-02" },
    { title: "Deploy staging build", project_id: pIds[4], status: "done", priority: "medium", due_date: "2026-03-29" },
    { title: "Create onboarding flow", project_id: pIds[0], status: "todo", priority: "high", due_date: "2026-04-05" },
    { title: "Fix responsive issues", project_id: pIds[3], status: "review", priority: "medium", due_date: "2026-04-04" },
    { title: "API rate limiting", project_id: pIds[1], status: "todo", priority: "high", due_date: "2026-04-10" },
    { title: "Push notification setup", project_id: pIds[2], status: "inprogress", priority: "medium", due_date: "2026-04-08" },
    { title: "Database optimization", project_id: pIds[1], status: "done", priority: "high", due_date: "2026-03-20" },
    { title: "User profile page", project_id: pIds[0], status: "done", priority: "low", due_date: "2026-03-18" },
  ].map((t) => ({ ...t, user_id: userId, description: "" }));

  await supabase.from("tasks").insert(taskData as any);

  // Seed income
  const incomeData = [
    { amount: 5000, source: "Client Payment", description: "Website Redesign milestone 1", date: "2026-03-01", project_id: pIds[0] },
    { amount: 3200, source: "Consulting Fee", description: "API architecture review", date: "2026-02-15", project_id: pIds[1] },
    { amount: 8500, source: "Project Payment", description: "Dashboard V2 final delivery", date: "2026-02-28", project_id: pIds[3] },
    { amount: 2000, source: "Retainer", description: "Monthly DevOps retainer", date: "2026-03-01", project_id: pIds[4] },
    { amount: 4500, source: "Milestone Payment", description: "Mobile App Phase 1", date: "2026-03-10", project_id: pIds[2] },
  ].map((e) => ({ ...e, user_id: userId }));

  await supabase.from("income_entries").insert(incomeData as any);

  // Seed expenses
  const expenseData = [
    { amount: 320, category: "Hosting", description: "AWS monthly", date: "2026-03-01", project_id: pIds[1] },
    { amount: 150, category: "Software", description: "Design tool license", date: "2026-03-05", project_id: pIds[0] },
    { amount: 99, category: "Software", description: "CI/CD platform", date: "2026-03-01", project_id: pIds[4] },
    { amount: 500, category: "Marketing", description: "Ad campaign", date: "2026-02-20", project_id: pIds[2] },
    { amount: 200, category: "Operations", description: "Domain renewals", date: "2026-03-08", project_id: null },
  ].map((e) => ({ ...e, user_id: userId }));

  await supabase.from("expense_entries").insert(expenseData as any);

  // Seed budgets
  const budgetData = [
    { category: "Development", allocated_amount: 15000, period: "monthly", project_id: null },
    { category: "Design", allocated_amount: 8000, period: "monthly", project_id: null },
    { category: "Marketing", allocated_amount: 5000, period: "monthly", project_id: null },
    { category: "Operations", allocated_amount: 3000, period: "monthly", project_id: null },
  ].map((b) => ({ ...b, user_id: userId }));

  await supabase.from("budgets").insert(budgetData as any);

  // Seed members
  const memberData = [
    { name: "Alexandra Deff", email: "alex@worknest.io", role: "member", project_id: pIds[0] },
    { name: "Edwin Adenike", email: "edwin@worknest.io", role: "member", project_id: pIds[1] },
    { name: "Isaac Oluwatemilorun", email: "isaac@worknest.io", role: "member", project_id: pIds[2] },
    { name: "David Oshodi", email: "david@worknest.io", role: "member", project_id: pIds[3] },
  ].map((m) => ({ ...m, user_id: userId }));

  await supabase.from("project_members").insert(memberData as any);

  // Seed calendar events
  const eventData = [
    { title: "Team Standup", description: "Daily sync", start_time: "2026-03-17T09:00:00Z", end_time: "2026-03-17T09:30:00Z", project_id: pIds[0] },
    { title: "Design Review", description: "Review mockups", start_time: "2026-03-18T14:00:00Z", end_time: "2026-03-18T15:00:00Z", project_id: pIds[0] },
    { title: "Sprint Planning", description: "Plan next sprint", start_time: "2026-03-19T10:00:00Z", end_time: "2026-03-19T11:30:00Z", project_id: pIds[1] },
    { title: "Client Meeting", description: "Progress update with client", start_time: "2026-03-20T14:00:00Z", end_time: "2026-03-20T16:00:00Z", project_id: pIds[2] },
    { title: "Code Review", description: "Review PRs", start_time: "2026-03-21T11:00:00Z", end_time: "2026-03-21T12:00:00Z", project_id: pIds[1] },
    { title: "Meeting with Arc Company", description: "Partnership discussion", start_time: "2026-03-15T14:00:00Z", end_time: "2026-03-15T16:00:00Z", project_id: null, status: "scheduled" },
  ].map((e) => ({ ...e, user_id: userId, status: e.status || "scheduled" }));

  await supabase.from("calendar_events").insert(eventData as any);
}
