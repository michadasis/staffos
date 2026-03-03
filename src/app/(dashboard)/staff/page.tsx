"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-success bg-success/10 border-success/20",
  ON_LEAVE: "text-warning bg-warning/10 border-warning/20",
  INACTIVE: "text-danger bg-danger/10 border-danger/20",
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  MANAGER: "text-accent bg-accent/10 border-accent/20",
  STAFF: "text-text-soft bg-text-soft/10 border-text-soft/20",
};

function Badge({ label, type = "status" }: { label: string; type?: "status" | "role" }) {
  const map = type === "role" ? ROLE_COLORS : STATUS_COLORS;
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${map[label] || "text-text-muted bg-surface border-border"}`}>
      {label.replace("_", " ")}
    </span>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isAdmin = user?.role === "ADMIN";

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "STAFF", departmentId: "", jobTitle: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // document state
  const [profileTab, setProfileTab] = useState<"info" | "documents">("info");
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // approval state
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [emailRequests, setEmailRequests] = useState<any[]>([]);
  const [resolvingEmailId, setResolvingEmailId] = useState<number | null>(null);

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchStaff = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (deptFilter !== "All") params.set("department", deptFilter);
    fetch(`/api/staff?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setStaff(data || []))
      .finally(() => setLoading(false));
  };

  const fetchPending = () => {
    if (!isAdmin) return;
    fetch("/api/staff/pending").then((r) => r.json()).then(({ data }) => setPendingUsers(data || []));
  };

  const fetchEmailRequests = () => {
    if (!isAdminOrManager) return;
    fetch("/api/auth/email-change").then((r) => r.json()).then(({ data }) => setEmailRequests(data || []));
  };

  const fetchDocuments = async (employeeId: number) => {
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/staff/documents?employeeId=${employeeId}`);
      const json = await res.json();
      setDocuments(json.data || []);
    } catch { setDocuments([]); }
    finally { setDocsLoading(false); }
  };

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then(({ data }) => setDepartments(data || []));
    fetchPending();
    fetchEmailRequests();
  }, []);

  useEffect(() => { fetchStaff(); }, [search, deptFilter]);

  // ── document handlers ──────────────────────────────────────────────────────

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected?.employee?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10MB."); return; }
    setUploadingDoc(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const n = file.name.toLowerCase();
      const docType = /contract/.test(n) ? "Contract"
        : /\bid\b/.test(n) ? "ID"
        : /cv|resume/.test(n) ? "CV"
        : /cert/.test(n) ? "Certificate"
        : "Other";
      const res = await fetch("/api/staff/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selected.employee.id, name: file.name, type: docType, fileData: base64, fileType: file.type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Document uploaded!");
      fetchDocuments(selected.employee.id);
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingDoc(false); if (docInputRef.current) docInputRef.current.value = ""; }
  };

  const handleDocDelete = async (docId: number) => {
    if (!confirm("Delete this document?")) return;
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/staff/documents?docId=${docId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Document deleted");
      setDocuments((d) => d.filter((x) => x.id !== docId));
    } catch (err: any) { toast.error(err.message); }
    finally { setDeletingDocId(null); }
  };

  const downloadDoc = (doc: any) => {
    try {
      const byteChars = atob(doc.url);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = doc.name; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download document"); }
  };

  const formatBytes = (b: number) =>
    b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  // ── staff handlers ─────────────────────────────────────────────────────────

  const openEdit = (s: any) => {
    setEditForm({
      name: s.name || "",
      role: s.role || "STAFF",
      jobTitle: s.employee?.jobTitle || "",
      phone: s.employee?.phone || "",
      address: s.employee?.address || "",
      status: s.employee?.status || "ACTIVE",
      departmentId: s.employee?.department?.id || "",
      supervisorId: s.employee?.supervisor?.id || "",
    });
    setEditing(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          departmentId: editForm.departmentId ? parseInt(editForm.departmentId) : null,
          supervisorId: editForm.supervisorId ? parseInt(editForm.supervisorId) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Employee updated!");
      setEditing(false);
      setSelected(null);
      fetchStaff();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${selected.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Employee deleted");
      setShowDeleteConfirm(false);
      setSelected(null);
      fetchStaff();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, departmentId: addForm.departmentId ? parseInt(addForm.departmentId) : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Employee added!");
      setShowAdd(false);
      setAddForm({ name: "", email: "", password: "", role: "STAFF", departmentId: "", jobTitle: "" });
      fetchStaff();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleApproval = async (userId: number, action: "approve" | "reject") => {
    setApprovingId(userId);
    try {
      const res = await fetch("/api/staff/pending", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(action === "approve" ? "User approved!" : "User rejected");
      fetchPending(); fetchStaff();
    } catch (err: any) { toast.error(err.message); }
    finally { setApprovingId(null); }
  };

  const handleEmailRequest = async (requestId: number, action: "approve" | "reject") => {
    setResolvingEmailId(requestId);
    try {
      const res = await fetch("/api/auth/email-change", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(action === "approve" ? "Email change approved!" : "Email change rejected");
      fetchEmailRequests();
    } catch (err: any) { toast.error(err.message); }
    finally { setResolvingEmailId(null); }
  };

  const depts = ["All", ...departments.map((d: any) => d.name)];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text-main">Staff Directory</h2>
          <p className="text-xs text-text-muted mt-0.5">{staff.length} employees</p>
        </div>
        {isAdminOrManager && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Employee</button>
        )}
      </div>

      {/* Email change requests */}
      {isAdminOrManager && emailRequests.length > 0 && (
        <div className="card border-accent/30 bg-accent/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-accent/20 flex items-center gap-2">
            <span className="text-accent text-base">✉️</span>
            <span className="text-[13px] font-bold text-text-main">Email Change Requests</span>
            <span className="ml-1 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">{emailRequests.length}</span>
          </div>
          <div className="divide-y divide-border">
            {emailRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 flex-wrap md:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-main">{r.user.name}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    <span className="line-through">{r.currentEmail}</span>
                    <span className="mx-2 text-accent">→</span>
                    <span className="text-text-soft font-semibold">{r.newEmail}</span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">Requested {new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleEmailRequest(r.id, "approve")} disabled={resolvingEmailId === r.id}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors disabled:opacity-50">
                    {resolvingEmailId === r.id ? "…" : "Approve"}
                  </button>
                  <button onClick={() => handleEmailRequest(r.id, "reject")} disabled={resolvingEmailId === r.id}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending approvals */}
      {isAdmin && pendingUsers.length > 0 && (
        <div className="card border-warning/30 bg-warning/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-warning/20 flex items-center gap-2">
            <span className="text-warning text-base">⏳</span>
            <span className="text-[13px] font-bold text-text-main">Pending Approvals</span>
            <span className="ml-1 text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
          </div>
          <div className="divide-y divide-border">
            {pendingUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-warning/20 border border-warning/30 flex items-center justify-center text-[11px] font-bold text-warning flex-shrink-0">
                  {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-main">{u.name}</div>
                  <div className="text-[11px] text-text-muted">{u.email} · Registered {new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApproval(u.id, "approve")} disabled={approvingId === u.id}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors disabled:opacity-50">
                    {approvingId === u.id ? "…" : "Approve"}
                  </button>
                  <button onClick={() => handleApproval(u.id, "reject")} disabled={approvingId === u.id}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…" className="input w-52 text-sm" />
        {depts.map((d) => (
          <button key={d} onClick={() => setDeptFilter(d)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors
              ${deptFilter === d ? "bg-accent text-white border-accent" : "bg-surface text-text-muted border-border hover:border-accent/40"}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Staff grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card p-5 h-44 animate-pulse bg-surface-alt" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {staff.map((s) => {
            const initials = s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
            const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
            const bg = colors[s.name.charCodeAt(0) % colors.length];
            const total = s.employee?._count?.assignedTasks || 0;
            const completed = s.employee?.assignedTasks?.length || 0;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <div key={s.id} onClick={() => { setSelected(s); setEditing(false); setProfileTab("info"); }}
                className="card p-5 cursor-pointer hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-3 mb-3.5">
                  <div style={{ background: bg }} className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 font-mono">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-text-main truncate">{s.name}</div>
                    <div className="text-[11px] text-text-muted truncate">{s.email}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <Badge label={s.role} type="role" />
                  <Badge label={s.employee?.status || "ACTIVE"} type="status" />
                </div>
                <div className="text-[11px] text-text-muted mb-2.5">🏢 {s.employee?.department?.name || "—"}</div>
                {s.employee?.supervisor && (
                  <div className="text-[11px] text-text-muted mb-2.5">👤 {s.employee.supervisor.user?.name}</div>
                )}
                {total > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-text-muted mb-1">
                      <span>Tasks</span>
                      <span className="font-mono text-text-main">{completed}/{total}</span>
                    </div>
                    <div className="h-1 bg-border rounded-full">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && !editing && (
        <div onClick={() => { setSelected(null); setProfileTab("info"); }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 pb-0">
              <div className="flex gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-white font-mono flex-shrink-0">
                  {selected.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-[16px] font-bold text-text-main">{selected.name}</div>
                  <div className="text-[12px] text-text-muted">{selected.email}</div>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <Badge label={selected.role} type="role" />
                    <Badge label={selected.employee?.status || "ACTIVE"} type="status" />
                  </div>
                </div>
              </div>
              <div className="flex border-b border-border">
                {(["info", "documents"] as const).map((t) => (
                  <button key={t} onClick={() => { setProfileTab(t); if (t === "documents" && selected.employee?.id) fetchDocuments(selected.employee.id); }}
                    className={`text-[12px] font-semibold px-4 py-2.5 border-b-2 transition-colors -mb-px
                      ${profileTab === t ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-soft"}`}>
                    {t === "info" ? "Profile" : "Documents"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {profileTab === "info" && (
                <div>
                  {[
                    ["Department", selected.employee?.department?.name || "—"],
                    ["Job Title",  selected.employee?.jobTitle || "—"],
                    ["Phone",      selected.employee?.phone || "—"],
                    ["Address",    selected.employee?.address || "—"],
                    ["Supervisor", selected.employee?.supervisor?.user?.name || "—"],
                    ["Joined",     selected.employee?.joinDate ? new Date(selected.employee.joinDate).toLocaleDateString() : "—"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-2.5 border-b border-border text-sm">
                      <span className="text-text-muted">{l}</span>
                      <span className="text-text-main font-medium">{v as string}</span>
                    </div>
                  ))}
                </div>
              )}

              {profileTab === "documents" && (
                <div className="space-y-3">
                  {isAdminOrManager && (
                    <div>
                      <input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.csv,.txt,.zip" />
                      <button onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-accent/50 text-text-muted hover:text-accent transition-colors text-[12px] font-semibold disabled:opacity-50">
                        {uploadingDoc ? "Uploading…" : "+ Upload Document"}
                      </button>
                      <p className="text-[10px] text-text-muted mt-1.5 text-center">PDF, Word, images, Excel, ZIP — max 10MB</p>
                    </div>
                  )}
                  {docsLoading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-alt animate-pulse" />)}</div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-text-muted text-[12px]">No documents uploaded yet</div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => {
                        const ext = doc.name.split(".").pop()?.toLowerCase() || "";
                        const icon = ext === "pdf" ? "📄"
                          : ["doc","docx"].includes(ext) ? "📝"
                          : ["jpg","jpeg","png","gif","webp"].includes(ext) ? "🖼"
                          : ["xlsx","xls","csv"].includes(ext) ? "📊"
                          : ["zip","rar"].includes(ext) ? "🗜"
                          : "📎";
                        return (
                          <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-alt border border-border hover:border-accent/30 transition-colors">
                            <span className="text-xl flex-shrink-0">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold text-text-main truncate">{doc.name}</div>
                              <div className="flex gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-accent bg-accent/10 border border-accent/20 rounded-full px-1.5 py-0.5 font-semibold">{doc.type}</span>
                                <span className="text-[10px] text-text-muted">{formatBytes(doc.size || 0)}</span>
                                <span className="text-[10px] text-text-muted">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => downloadDoc(doc)} title="Download"
                                className="w-7 h-7 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-[12px] flex items-center justify-center">
                                ↓
                              </button>
                              {isAdminOrManager && (
                                <button onClick={() => handleDocDelete(doc.id)} disabled={deletingDocId === doc.id} title="Delete"
                                  className="w-7 h-7 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors text-[12px] flex items-center justify-center disabled:opacity-50">
                                  {deletingDocId === doc.id ? "…" : "×"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 pt-3 border-t border-border flex gap-2.5">
              {isAdminOrManager && <button onClick={() => openEdit(selected)} className="btn-primary flex-1">Edit</button>}
              {isAdmin && (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-sm font-semibold hover:bg-danger/20 transition-colors">
                  Delete
                </button>
              )}
              <button onClick={() => { setSelected(null); setProfileTab("info"); }} className="btn-ghost flex-1">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {selected && editing && (
        <div onClick={() => setEditing(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-text-main mb-5">Edit — {selected.name}</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Job Title</label>
                <input type="text" value={editForm.jobTitle} onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })} className="input" placeholder="e.g. Software Engineer" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input" placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label className="label">Department</label>
                <select value={editForm.departmentId} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })} className="input">
                  <option value="">No department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Supervisor</label>
                <select value={editForm.supervisorId} onChange={(e) => setEditForm({ ...editForm, supervisorId: e.target.value })} className="input">
                  <option value="">No supervisor</option>
                  {staff.filter((s: any) => s.id !== selected?.id && s.employee?.id).map((s: any) => (
                    <option key={s.employee.id} value={s.employee.id}>
                      {s.name}{s.employee?.jobTitle ? ` — ${s.employee.jobTitle}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="input">
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label className="label">Role</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="input">
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              )}
              <div>
                <label className="label">Address</label>
                <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="input" placeholder="123 Main St" />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Save Changes"}</button>
                <button type="button" onClick={() => setEditing(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && selected && (
        <div onClick={() => setShowDeleteConfirm(false)} className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-sm text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-text-main mb-2">Delete Employee?</h3>
            <p className="text-sm text-text-muted mb-6">
              This will permanently delete <span className="text-text-main font-semibold">{selected.name}</span> and all their data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white font-bold text-sm hover:bg-red-600 transition-colors">
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && isAdminOrManager && (
        <div onClick={() => setShowAdd(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-md">
            <h3 className="text-lg font-bold text-text-main mb-5">Add New Employee</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              {[["Full Name","name","text"],["Email Address","email","email"],["Password","password","password"],["Job Title","jobTitle","text"]].map(([l,k,t]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input type={t} value={(addForm as any)[k]} onChange={(e) => setAddForm({ ...addForm, [k]: e.target.value })} className="input" required={k !== "jobTitle"} />
                </div>
              ))}
              <div>
                <label className="label">Department</label>
                <select value={addForm.departmentId} onChange={(e) => setAddForm({ ...addForm, departmentId: e.target.value })} className="input">
                  <option value="">No department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Role</label>
                <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} className="input">
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  {isAdmin && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Adding…" : "Add Employee"}</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
