"use client";

import { useEffect, useRef, useState } from "react";
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

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff" }}>
      {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

// ⚠️ CRITICAL: TaskFormFields must be defined OUTSIDE the page component
// to prevent React from unmounting inputs on every keystroke
function TaskFormFields({ form, setForm, staff, departments }: {
  form: any; setForm: (f: any) => void; staff: any[]; departments: any[];
}) {
  return (
    <>
      <div>
        <label className="label">Task Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input"
          required
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input min-h-[70px] resize-none"
        />
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
          <option value="">— Unassigned —</option>
          {staff.map((s: any) => (
            <option key={s.employee?.id} value={s.employee?.id}>
              {s.name} · {s.employee?.department?.name || s.role}
            </option>
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
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <span>🖼️</span>;
  if (type === "application/pdf") return <span>📄</span>;
  if (type.includes("word") || type.includes("document")) return <span>📝</span>;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return <span>📊</span>;
  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return <span>🗜️</span>;
  return <span>📎</span>;
}

function formatBytes(base64: string) {
  const bytes = (base64.length * 3) / 4;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function downloadFile(fileName: string, fileType: string, fileData: string) {
  const byteChars = atob(fileData);
  const byteArr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArr], { type: fileType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

function DiscussionPanel({ task, onClose, currentUser }: { task: any; onClose: () => void; currentUser: any }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAdminOrManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const fetchComments = () => {
    fetch(`/api/tasks/${task.id}/comments`).then((r) => r.json()).then(({ data }) => setComments(data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchComments(); }, [task.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large. Max 5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setAttachedFile({ name: file.name, type: file.type, data: base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const postComment = async () => {
    if (!newComment.trim() && !attachedFile) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          fileName: attachedFile?.name || null,
          fileType: attachedFile?.type || null,
          fileData: attachedFile?.data || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setComments((c) => [...c, json.data]);
      setNewComment("");
      setAttachedFile(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setPosting(false); }
  };

  const deleteComment = async (commentId: number) => {
    const res = await fetch(`/api/tasks/${task.id}/comments?commentId=${commentId}`, { method: "DELETE" });
    if (res.ok) { setComments((c) => c.filter((x) => x.id !== commentId)); toast.success("Comment deleted"); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-bold text-text-main">{task.title}</div>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                <Badge label={task.status} />
                <Badge label={task.priority} />
                {task.department && <span className="text-[10px] text-text-muted bg-surface-alt px-2 py-0.5 rounded-full border border-border">{task.department.name}</span>}
              </div>
              {task.description && <p className="text-[12px] text-text-muted mt-2">{task.description}</p>}
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-main text-lg flex-shrink-0">✕</button>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            {task.assignee ? (
              <><Avatar name={task.assignee.user.name} size={18} /><span className="text-[11px] text-text-muted">Assigned to <span className="text-text-soft font-semibold">{task.assignee.user.name}</span></span></>
            ) : (
              <span className="text-[11px] text-text-muted italic">Unassigned</span>
            )}
            {task.deadline && <span className="text-[11px] text-text-muted ml-auto">📅 {new Date(task.deadline).toLocaleDateString()}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wide">💬 Discussion · {comments.length} comment{comments.length !== 1 ? "s" : ""}</div>
          {loading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-surface-alt rounded-xl animate-pulse" />)}</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8"><div className="text-3xl mb-2">💬</div><div className="text-sm text-text-muted">No comments yet. Start the discussion!</div></div>
          ) : (
            comments.map((c) => {
              const isOwn = c.authorId === currentUser?.id;
              const isImage = c.fileType?.startsWith("image/");
              return (
                <div key={c.id} className="flex gap-3 group">
                  <Avatar name={c.authorName || "?"} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[12px] font-bold text-text-main">{c.authorName}</span>
                      <span className="text-[10px] text-text-muted">{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {(isOwn || isAdminOrManager) && (
                        <button onClick={() => deleteComment(c.id)} className="ml-auto text-[10px] text-danger opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Delete</button>
                      )}
                    </div>
                    {c.content && (
                      <div className="text-[13px] text-text-soft leading-relaxed bg-surface-alt border border-border rounded-xl px-3.5 py-2.5 mb-2">{c.content}</div>
                    )}
                    {c.fileData && (
                      isImage ? (
                        <div className="mt-1">
                          <img
                            src={`data:${c.fileType};base64,${c.fileData}`}
                            alt={c.fileName}
                            className="max-w-full max-h-48 rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity object-cover"
                            onClick={() => setPreviewImg(`data:${c.fileType};base64,${c.fileData}`)}
                          />
                          <button
                            onClick={() => downloadFile(c.fileName, c.fileType, c.fileData)}
                            className="text-[10px] text-accent hover:underline mt-1 block">
                            Download {c.fileName}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => downloadFile(c.fileName, c.fileType, c.fileData)}
                          className="flex items-center gap-2.5 bg-surface-alt border border-border hover:border-accent/40 rounded-xl px-3.5 py-2.5 transition-colors group/file mt-1">
                          <span className="text-xl"><FileIcon type={c.fileType} /></span>
                          <div className="text-left min-w-0">
                            <div className="text-[12px] font-semibold text-text-main truncate max-w-[200px]">{c.fileName}</div>
                            <div className="text-[10px] text-text-muted">{formatBytes(c.fileData)} · Click to download</div>
                          </div>
                          <span className="ml-auto text-accent text-[11px] opacity-0 group-hover/file:opacity-100 transition-opacity">↓</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          {attachedFile && (
            <div className="flex items-center gap-2.5 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2 mb-3">
              <span className="text-base"><FileIcon type={attachedFile.type} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-text-main truncate">{attachedFile.name}</div>
                <div className="text-[10px] text-text-muted">{formatBytes(attachedFile.data)}</div>
              </div>
              <button onClick={() => setAttachedFile(null)} className="text-text-muted hover:text-danger text-sm flex-shrink-0">✕</button>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <Avatar name={currentUser?.name || "?"} size={28} />
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
              placeholder="Write a comment… (Enter to post)"
              className="input text-sm resize-none min-h-[60px] flex-1"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.txt" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-text-muted hover:text-accent border border-border hover:border-accent/40 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5">
                📎 Attach File
              </button>
            </div>
            <button onClick={postComment} disabled={posting || (!newComment.trim() && !attachedFile)} className="btn-primary text-sm px-5 disabled:opacity-50">{posting ? "Posting…" : "Post"}</button>
          </div>
        </div>
      </div>

      {previewImg && (
        <div onClick={() => setPreviewImg(null)} className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 cursor-zoom-out">
          <img src={previewImg} alt="Preview" className="max-w-full max-h-full rounded-xl object-contain" />
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 text-white text-2xl hover:text-white/70">✕</button>
        </div>
      )}
    </div>
  );
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
  const [taskForDiscussion, setTaskForDiscussion] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "MEDIUM", status: "PENDING", assigneeId: "", departmentId: "", deadline: "" });
  const [createForm, setCreateForm] = useState({ title: "", description: "", priority: "MEDIUM", status: "PENDING", assigneeId: "", departmentId: "", deadline: "" });
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const fetchTasks = () => {
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (user?.role === "STAFF" && user?.employee?.id) params.set("assigneeId", String(user.employee.id));
    fetch(`/api/tasks?${params}`).then((r) => r.json()).then(({ data }) => setTasks(data || [])).finally(() => setLoading(false));
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
      title: t.title, description: t.description || "", priority: t.priority, status: t.status,
      assigneeId: t.assignee?.id ? String(t.assignee.id) : "",
      departmentId: t.department?.id ? String(t.department.id) : "",
      deadline: t.deadline ? new Date(t.deadline).toISOString().split("T")[0] : "",
    });
    setTaskToEdit(t);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskToEdit.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, assigneeId: editForm.assigneeId ? parseInt(editForm.assigneeId) : null, departmentId: editForm.departmentId ? parseInt(editForm.departmentId) : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Task updated!"); setTaskToEdit(null); fetchTasks();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, assigneeId: createForm.assigneeId ? parseInt(createForm.assigneeId) : null, departmentId: createForm.departmentId ? parseInt(createForm.departmentId) : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Task created!"); setShowCreate(false);
      setCreateForm({ title: "", description: "", priority: "MEDIUM", status: "PENDING", assigneeId: "", departmentId: "", deadline: "" });
      fetchTasks();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { toast.success("Status updated"); fetchTasks(); }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return; setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Task deleted"); setTaskToDelete(null); fetchTasks();
    } catch (err: any) { toast.error(err.message); } finally { setDeleting(false); }
  };

  const statuses = ["All", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const cols = ["PENDING", "IN_PROGRESS", "COMPLETED"];

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text-main">{isAdminOrManager ? "Task Management" : "My Tasks"}</h2>
          <p className="text-xs text-text-muted mt-0.5">{tasks.length} tasks</p>
        </div>
        {isAdminOrManager && <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Task</button>}
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
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors
                ${view === v ? "bg-accent-soft text-accent border-accent/30" : "bg-surface text-text-muted border-border"}`}>
              {v === "list" ? "☰ List" : "⬛ Board"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-surface-alt" />)}</div>
      ) : view === "list" ? (
        <div className="space-y-2.5">
          {tasks.length === 0 && (
            <div className="card p-12 text-center text-text-muted text-sm">No tasks found</div>
          )}
          {tasks.map((t) => {
            const priorityLeft: Record<string, string> = {
              CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#10b981",
            };
            const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== "COMPLETED" && t.status !== "CANCELLED";
            return (
              <div key={t.id} className="card overflow-hidden hover:border-accent/30 transition-colors group">
                {/* colour bar on left by priority */}
                <div className="flex">
                  <div className="w-1 flex-shrink-0" style={{ background: priorityLeft[t.priority] || "#3b82f6" }} />
                  <div className="flex-1 px-4 py-3.5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-text-main leading-snug">{t.title}</div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <Badge label={t.status} />
                          <Badge label={t.priority} />
                          {t.department && (
                            <span className="text-[10px] text-text-muted bg-surface-alt px-2 py-0.5 rounded-full border border-border">{t.department.name}</span>
                          )}
                        </div>
                      </div>
                      {/* Action buttons — always visible on mobile, hover on desktop */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setTaskForDiscussion(t)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:border-accent/40 hover:text-accent text-text-muted transition-colors text-sm"
                          title="Discussion">
                          💬
                        </button>
                        {isAdminOrManager && (
                          <>
                            <button onClick={() => openEdit(t)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors text-sm">
                              ✏️
                            </button>
                            <button onClick={() => setTaskToDelete(t)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors text-sm">
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Assignee */}
                        {t.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={t.assignee.user.name} size={20} />
                            <span className="text-[11px] text-text-muted">{t.assignee.user.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-muted italic border border-dashed border-border rounded-lg px-2 py-0.5">Unassigned</span>
                        )}
                        {/* Deadline */}
                        {t.deadline && (
                          <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? "text-danger font-semibold" : "text-text-muted"}`}>
                            📅 {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {isOverdue && <span className="text-[9px] bg-danger/10 border border-danger/20 text-danger px-1.5 py-0.5 rounded-full">Overdue</span>}
                          </span>
                        )}
                        {/* Comments */}
                        <button onClick={() => setTaskForDiscussion(t)}
                          className="text-[11px] text-text-muted hover:text-accent transition-colors flex items-center gap-1">
                          💬 {t._count?.comments || 0}
                          {t._count?.comments > 0 && <span className="text-accent text-[10px]">· View</span>}
                        </button>
                      </div>
                      {/* Status changer */}
                      <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}
                        className="bg-bg border border-border rounded-lg text-[11px] text-text-muted px-2.5 py-1.5 outline-none cursor-pointer hover:border-accent/40 transition-colors">
                        {(isAdminOrManager
                          ? ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
                          : ["PENDING", "IN_PROGRESS", "COMPLETED"]
                        ).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Board — horizontally scrollable on mobile */
        <div>
          <div className="flex flex-col gap-4 md:grid md:grid-cols-3">
            {cols.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col);
              const colColor: Record<string, string> = { PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#10b981" };
              return (
                <div key={col} className="card p-4 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colColor[col] }} />
                    <span className="text-[13px] font-bold text-text-main">{col.replace("_", " ")}</span>
                    <span className="ml-auto text-[10px] text-text-muted bg-border rounded-full px-2 py-0.5">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {colTasks.map((t) => (
                      <div key={t.id} className="bg-bg border border-border rounded-xl p-3.5 hover:border-accent/30 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-[12px] font-semibold text-text-main leading-snug">{t.title}</div>
                          {isAdminOrManager && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => openEdit(t)} className="text-accent text-[11px] hover:bg-accent/10 rounded-lg w-6 h-6 flex items-center justify-center">✏️</button>
                              <button onClick={() => setTaskToDelete(t)} className="text-danger text-[11px] hover:bg-danger/10 rounded-lg w-6 h-6 flex items-center justify-center">🗑</button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mb-2.5">
                          {t.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar name={t.assignee.user.name} size={18} />
                              <span className="text-[10px] text-text-muted">{t.assignee.user.name.split(" ")[0]}</span>
                            </div>
                          ) : <span className="text-[10px] text-text-muted italic">Unassigned</span>}
                          <Badge label={t.priority} />
                        </div>
                        <div className="flex items-center justify-between">
                          <button onClick={() => setTaskForDiscussion(t)} className="text-[10px] text-text-muted hover:text-accent transition-colors flex items-center gap-1">
                            💬 {t._count?.comments || 0}
                          </button>
                          {t.deadline && (
                            <span className="text-[10px] text-text-muted">📅 {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && <div className="text-[11px] text-text-muted text-center py-6 border border-dashed border-border rounded-xl">Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {taskForDiscussion && <DiscussionPanel task={taskForDiscussion} currentUser={user} onClose={() => { setTaskForDiscussion(null); fetchTasks(); }} />}

      {taskToEdit && (
        <div onClick={() => setTaskToEdit(null)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-text-main mb-5">Edit Task</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <TaskFormFields form={editForm} setForm={setEditForm} staff={staff} departments={departments} />
              <div className="flex gap-2.5 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Save Changes"}</button>
                <button type="button" onClick={() => setTaskToEdit(null)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskToDelete && (
        <div onClick={() => setTaskToDelete(null)} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-sm text-center">
            <div className="text-4xl mb-4">🗑️</div>
            <h3 className="text-lg font-bold text-text-main mb-2">Delete Task?</h3>
            <p className="text-sm text-text-muted mb-6">Permanently delete <span className="text-text-main font-semibold">"{taskToDelete.title}"</span>?</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-danger text-white font-bold text-sm hover:bg-red-600 transition-colors">{deleting ? "Deleting…" : "Yes, Delete"}</button>
              <button onClick={() => setTaskToDelete(null)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && isAdminOrManager && (
        <div onClick={() => setShowCreate(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-text-main mb-5">Create New Task</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <TaskFormFields form={createForm} setForm={setCreateForm} staff={staff} departments={departments} />
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
