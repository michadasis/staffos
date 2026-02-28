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

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF", departmentId: "", jobTitle: "" });
  const [saving, setSaving] = useState(false);

  const fetchStaff = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (deptFilter !== "All") params.set("department", deptFilter);
    fetch(`/api/staff?${params}`).then((r) => r.json()).then(({ data }) => setStaff(data || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then(({ data }) => setDepartments(data || []));
  }, []);

  useEffect(() => { fetchStaff(); }, [search, deptFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, departmentId: form.departmentId ? parseInt(form.departmentId) : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Employee added!");
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "STAFF", departmentId: "", jobTitle: "" });
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
              <div key={s.id} onClick={() => setSelected(s)}
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

      {/* Detail modal */}
      {selected && (
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
              ["Joined", selected.employee?.joinDate ? new Date(selected.employee.joinDate).toLocaleDateString() : "—"],
              ["Phone", selected.employee?.phone || "—"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2.5 border-b border-border text-sm">
                <span className="text-text-muted">{l}</span>
                <span className="text-text-main font-medium">{v}</span>
              </div>
            ))}
            <div className="flex gap-2.5 mt-5">
              {isAdminOrManager && <button className="btn-primary flex-1">Edit Profile</button>}
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal - admin/manager only */}
      {showAdd && isAdminOrManager && (
        <div onClick={() => setShowAdd(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-7 w-full max-w-md">
            <h3 className="text-lg font-bold text-text-main mb-5">Add New Employee</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              {[["Full Name", "name", "text"], ["Email Address", "email", "email"], ["Password", "password", "password"], ["Job Title", "jobTitle", "text"]].map(([l, k, t]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="input" required={k !== "jobTitle"} />
                </div>
              ))}
              <div>
                <label className="label">Department</label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="input">
                  <option value="">No department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  {user?.role === "ADMIN" && <option value="ADMIN">Admin</option>}
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
