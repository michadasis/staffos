"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
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
  const { user } = useAuth();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "board">("list");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showCreate, setShowCreate] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({ title: "", description: "", priority: "MEDIUM", status: "PENDING", assigneeId: "", departmentId: "", deadline: "" });

  const fetchTasks = () => {
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (user?.role === "STAFF" && user?.employee?.id) {
      params.set("assigneeId", String(user.employee.id));
    }
    fetch(`/api/tasks?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setTasks(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdminOrManager) {
      fetch("/api/staff?limit=50").then((r) => r.json()).then(({ data }) => setStaff(data || []));
      fetch("/api/departments").then((r) => r.json()).then(({ data }) => setDepartments(data || []));
    }
  }, [isAdminOrManager]);

  useEffect(() => { if (user) fetchTasks(); }, [statusFilter, user]);

  const openEdit = (t: any) => {
    setEditForm({
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      status: t.status,
      assigneeId: t.assignee?.id ? String(t.assignee.id) : "",
      departmentId: t.department?.id ? String(t.department.id) : "",
      deadline: t.deadline ? new Date(t.deadline).toISOString().split("T")[0] : "",
    });
    setTaskToEdit(t);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          assigneeId: editForm.assigneeId ? parseInt(editForm.assigneeId) : null,
          departmentId: editForm.departmentId ? parseInt(editForm.departmentId) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Task updated!");
      setTaskToEdit(null);
      fetchTasks();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          assigneeId: createForm.assigneeId ? parseInt(createForm.assigneeId) : null,
          departmentId: createForm.departmentId ? parseInt(createForm.departmentId) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Task created!");
      setShowCreate(false);
      setCreateForm({ title: "", description: "", priority: "MEDIUM", status: "PENDING", assigneeId: "", departmentId: "", deadline: "" });
      fetchTasks();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success("Status updated"); fetchTasks(); }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Task deleted");
      setTaskToDelete(null);
      fetchTasks();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  const statuses = ["All", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const cols = ["PENDING", "IN_PROGRESS", "COMPLETED"];

  const TaskFormFields = ({ form, setForm }: { form: any; setForm: any }) => (
    <>
      <div>
        <label className="label">Task Title</label>
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[70px] resize-none" />
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
            {["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Assignee</label>
        <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="input">
          <option value="">Unassigned</option>
          {staff.map((s: any) => (
            <option key={s.employee?.id} value={s.employee?.id}>{s.name} — {s.employee?.department?.name || s.role}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Department</label>
          <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="input">
            <option value="">None</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Deadline</label>
          <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="input" />
        </div>
      </div>
    </>
  );

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text-main">{isAdminOrManager ? "Task Management" : "My Tasks"}</h2>
          <p className="text-xs text-text-muted mt-0.5">{tasks.length} tasks</p>
        </div>
        {isAdminOrManager && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Task</button>
        )}
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
          <div className="grid grid-cols-[2fr_1.4fr_0.7fr_0.9fr_0.8fr_auto] px-5 py-3 border-b border-border">
            {["Task", "Assignee", "Priority", "Deadline", "Status", "Actions"].map((h) => (
              <div key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{h}</div>
            ))}
          </div>
          {tasks.map((t, i) => (
            <div key={t.id}
              className={`grid grid-cols-[2fr_1.4fr_0.7fr_0.9fr_0.8fr_auto] px-5 py-3.5 items-center hover:bg-surface-alt transition-colors ${i < tasks.length - 1 ? "border-b border-border" : ""}`}>
              <div>
                <div className="text-[13px] font-semibold text-text-main">{t.title}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  💬 {t._count?.comments || 0} comments · {t.department?.name || "No dept"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0 ${t.assignee ? "bg-accent" : "bg-surface-alt border border-border"}`}>
                  {t.assignee?.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                </div>
                <span className={`text-[12px] truncate ${t.assignee ? "text-text-soft" : "text-text-muted italic"}`}>
                  {t.assignee?.user?.name || "Unassigned"}
                </span>
              </div>
              <Badge label={t.priority} />
              <div className="text-[11px] text-text-muted">
                {t.deadline ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
              </div>
              <Badge label={t.status} />
              <div className="flex items-center gap-1.5">
                <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}
                  className="bg-bg border border-border rounded-lg text-[11px] text-text-muted px-2 py-1 outline-none cursor-pointer">
                  {(isAdminOrManager
                    ? ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
                    : ["PENDING", "IN_PROGRESS", "COMPLETED"]
                  ).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
                {isAdminOrManager && (
                  <>
                    <button onClick={() => openEdit(t)}
                      className="text-accent hover:bg-accent/10 border border-accent/30 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors">
                      ✏️
                    </button>
                    <button onClick={() => setTaskToDelete(t)}
                      className="text-danger hover:bg-danger/10 border border-danger/30 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors">
                      🗑
                    </button>
                  </>
                )}
              </div>
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
                    <div key={t.id} className="bg-bg border border-border rounded-xl p-3.5 hover:border-accent/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-[12px] font-semibold text-text-main">{t.title}</div>
                        {isAdminOrManager && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(t)} className="text-accent text-[10px] hover:bg-accent/10 rounded px-1">✏️</button>
                            <button onClick={() => setTaskToDelete(t)} className="text-danger text-[10px] hover:bg-danger/10 rounded px-1">🗑</button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full text-[8px] font-bold text-white flex items-center justify-center ${t.assignee ? "bg-accent" : "bg-surface-alt border border-border"}`}>
                            {t.assignee?.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                          </div>
                          <span className="text-[10px] text-text-muted">{t.assignee?.user?.name?.split(" ")[0] || "Unassigned"}</span>
                        </div>
                        <Badge label={t.priority} />
                      </div>
                      <div className="text-[10px] text-text-muted">💬 {t._count?.comments || 0} comments</div>
                      {t.deadline && <div className="text-[10px] text-text-muted mt-1">📅 {new Date(t.deadline).toLocaleDateString()}</div>}
                    </div>
                  ))}
                  {colTasks.length === 0 && <div className="text-[11px] text-text-muted text-center py-4">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit task modal */}
      {taskToEdit && (
        <div onClick={() => setTaskToEdit(null)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-text-main mb-5">Edit Task</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <TaskFormFields form={editForm} setForm={setEditForm} />
              <div className="flex gap-2.5 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Save Changes"}</button>
                <button type="button" onClick={() => setTaskToEdit(null)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {taskToDelete && (
        <div onClick={() => setTaskToDelete(null)} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-sm text-center">
            <div className="text-4xl mb-4">🗑️</div>
            <h3 className="text-lg font-bold text-text-main mb-2">Delete Task?</h3>
            <p className="text-sm text-text-muted mb-6">
              This will permanently delete <span className="text-text-main font-semibold">"{taskToDelete.title}"</span>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white font-bold text-sm hover:bg-red-600 transition-colors">
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button onClick={() => setTaskToDelete(null)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && isAdminOrManager && (
        <div onClick={() => setShowCreate(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-text-main mb-5">Create New Task</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <TaskFormFields form={createForm} setForm={setCreateForm} />
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
