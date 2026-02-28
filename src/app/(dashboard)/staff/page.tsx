"use client";

import { useEffect, useState } from "react";
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

  const fetchStaff = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (deptFilter !== "All") params.set("department", deptFilter);
    fetch(`/api/staff?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setStaff(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then(({ data }) => setDepartments(data || []));
  }, []);

  useEffect(() => { fetchStaff(); }, [search, deptFilter]);

  const openEdit = (s: any) => {
    setEditForm({
      name: s.name || "",
      role: s.role || "STAFF",
      jobTitle: s.employee?.jobTitle || "",
      phone: s.employee?.phone || "",
      address: s.employee?.address || "",
      status: s.employee?.status || "ACTIVE",
      departmentId: s.employee?.department?.id || "",
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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Employee updated!");
      setEditing(false);
      setSelected(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const depts = ["All", ...departments.map((d: any) => d.name)];

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
            return (
              <div key={s.id} onClick={() => { setSelected(s); setEditing(false); }}
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
                {total > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-text-muted mb-1">
                      <span>Tasks</span><span className="font-mono text-text-main">{total}</span>
                    </div>
                    <div className="h-1 bg-border rounded-full">
                      <div className="h-full bg-accent rounded-full" style={{ width: "60%" }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Edit modal */}
      {selected && !editing && (
        <div onClick={() => setSelected(null)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-md">
            <div className="flex gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-white font-mono">
                {selected.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-lg font-bold text-text-main">{selected.name}</div>
                <div className="text-sm text-text-muted">{selected.email}</div>
                <div className="flex gap-1.5 mt-2">
                  <Badge label={selected.role} type="role" />
                  <Badge label={selected.employee?.status || "ACTIVE"} />
                </div>
              </div>
            </div>
            {[
              ["Department", selected.employee?.department?.name || "—"],
              ["Job Title", selected.employee?.jobTitle || "—"],
              ["Phone", selected.employee?.phone || "—"],
              ["Joined", selected.employee?.joinDate ? new Date(selected.employee.joinDate).toLocaleDateString() : "—"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2.5 border-b border-border text-sm">
                <span className="text-text-muted">{l}</span>
                <span className="text-text-main font-medium">{v}</span>
              </div>
            ))}
            <div className="flex gap-2.5 mt-5">
              {isAdminOrManager && (
                <button onClick={() => openEdit(selected)} className="btn-primary flex-1">✏️ Edit</button>
              )}
              {isAdmin && (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-sm font-semibold hover:bg-danger/20 transition-colors">
                  🗑 Delete
                </button>
              )}
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit form modal */}
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

      {/* Delete confirm modal */}
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
              {[["Full Name", "name", "text"], ["Email Address", "email", "email"], ["Password", "password", "password"], ["Job Title", "jobTitle", "text"]].map(([l, k, t]) => (
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
