"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-400/10 border-red-400/20",
  HIGH: "text-danger bg-danger/10 border-danger/20",
  MEDIUM: "text-warning bg-warning/10 border-warning/20",
  LOW: "text-success bg-success/10 border-success/20",
};
const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "text-success bg-success/10 border-success/20",
  IN_PROGRESS: "text-accent bg-accent/10 border-accent/20",
  PENDING: "text-warning bg-warning/10 border-warning/20",
  CANCELLED: "text-text-muted bg-surface border-border",
};

function Badge({ label }: { label: string }) {
  const map = { ...STATUS_BADGE, ...PRIORITY_BADGE };
  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${map[label] || "text-text-muted border-border"}`}>{label.replace("_", " ")}</span>;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "board">("list");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", status: "PENDING", assigneeId: "", departmentId: "", deadline: "" });
  const [saving, setSaving] = useState(false);

  const fetchTasks = () => {
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter !== "All") params.set("status", statusFilter);
    fetch(`/api/tasks?${params}`).then((r) => r.json()).then(({ data }) => setTasks(data || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/staff?limit=50").then((r) => r.json()).then(({ data }) => setStaff(data || []));
    fetch("/api/departments").then((r) => r.json()).then(({ data }) => setDepartments(data || []));
  }, []);

  useEffect(() => { fetchTasks(); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assigneeId: form.assigneeId ? parseInt(form.assigneeId) : null,
          departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Task created!");
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "MEDIUM", status: "PENDING", assigneeId: "", departmentId: "", deadline: "" });
      fetchTasks();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { toast.success("Status updated"); fetchTasks(); }
  };

  const statuses = ["All", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const cols = ["PENDING", "IN_PROGRESS", "COMPLETED"];

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text-main">Task Management</h2>
          <p className="text-xs text-text-muted mt-0.5">{tasks.length} tasks</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Task</button>
      </div>

      <div className="flex gap-2.5 flex-wrap items-center">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors
              ${statusFilter === s ? "bg-accent text-white border-accent" : "bg-surface text-text-muted border-border hover:border-accent/40"}`}>
            {s === "All" ? "All" : s.replace("_", " ")}
          </button>
        ))}
        <div className="ml-auto flex gap-1.5">
          {(["list", "board"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors capitalize
                ${view === v ? "bg-accent-soft text-accent border-accent/30" : "bg-surface text-text-muted border-border"}`}>
              {v === "list" ? "☰ List" : "⬛ Board"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="card h-14 animate-pulse bg-surface-alt" />)}</div>
      ) : view === "list" ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[2fr_1.2fr_0.7fr_0.9fr_0.8fr_auto] px-5 py-3 border-b border-border">
            {["Task", "Assignee", "Priority", "Deadline", "Status", ""].map((h) => (
              <div key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{h}</div>
            ))}
          </div>
          {tasks.map((t, i) => (
            <div key={t.id}
              className={`grid grid-cols-[2fr_1.2fr_0.7fr_0.9fr_0.8fr_auto] px-5 py-3.5 items-center hover:bg-surface-alt transition-colors ${i < tasks.length - 1 ? "border-b border-border" : ""}`}>
              <div>
                <div className="text-[13px] font-semibold text-text-main">{t.title}</div>
                <div className="text-[10px] text-text-muted mt-0.5">💬 {t._count?.comments || 0} · {t.department?.name || "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center">
                  {t.assignee?.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                </div>
                <span className="text-[12px] text-text-soft truncate">{t.assignee?.user?.name?.split(" ")[0] || "Unassigned"}</span>
              </div>
              <Badge label={t.priority} />
              <div className="text-[11px] text-text-muted">{t.deadline ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div>
              <Badge label={t.status} />
              <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}
                className="bg-bg border border-border rounded-lg text-[11px] text-text-muted px-2 py-1 outline-none cursor-pointer">
                {["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
          ))}
          {tasks.length === 0 && <div className="p-10 text-center text-text-muted text-sm">No tasks found</div>}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {cols.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            const colColor: Record<string, string> = { PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#10b981" };
            return (
              <div key={col} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{ background: colColor[col] }} />
                  <span className="text-[13px] font-bold text-text-main">{col.replace("_", " ")}</span>
                  <span className="ml-auto text-[10px] text-text-muted bg-border rounded-full px-2 py-0.5">{colTasks.length}</span>
                </div>
                <div className="space-y-2.5">
                  {colTasks.map((t) => (
                    <div key={t.id} className="bg-bg border border-border rounded-xl p-3.5">
                      <div className="text-[12px] font-semibold text-text-main mb-2">{t.title}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-accent text-[8px] font-bold text-white flex items-center justify-center">
                            {t.assignee?.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                          </div>
                          <span className="text-[10px] text-text-muted">{t.assignee?.user?.name?.split(" ")[0] || "—"}</span>
                        </div>
                        <Badge label={t.priority} />
                      </div>
                      {t.deadline && <div className="text-[10px] text-text-muted mt-2">📅 {new Date(t.deadline).toLocaleDateString()}</div>}
                    </div>
                  ))}
                  {colTasks.length === 0 && <div className="text-[11px] text-text-muted text-center py-4">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-lg">
            <h3 className="text-lg font-bold text-text-main mb-5">Create New Task</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Task Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input min-h-[80px] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                    {["PENDING", "IN_PROGRESS"].map((s) => <option key={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Assign To</label>
                  <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="input">
                    <option value="">Unassigned</option>
                    {staff.map((s: any) => <option key={s.employee?.id} value={s.employee?.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="input">
                    <option value="">None</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Deadline</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="input" />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Creating…" : "Create Task"}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
