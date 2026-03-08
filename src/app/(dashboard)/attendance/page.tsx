"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "#22c55e", REMOTE: "#3b82f6", LATE: "#eab308",
  HALF_DAY: "#f97316", ABSENT: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present", REMOTE: "Remote", LATE: "Late",
  HALF_DAY: "Half Day", ABSENT: "Absent",
};

function Badge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "#64748b";
  return (
    <span style={{ background: color + "20", color, border: `1px solid ${color}30`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff" }}>
      {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [records, setRecords] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form, setForm] = useState({ employeeId: "", date: "", status: "PRESENT", clockIn: "", clockOut: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [filterEmp, setFilterEmp] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, limit: "200" });
      if (filterEmp) params.set("employeeId", filterEmp);
      const res = await fetch(`/api/attendance?${params}`);
      const { data } = await res.json();
      setRecords(data?.records || []);
    } finally { setLoading(false); }
  }, [month, filterEmp]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => {
    if (isAdmin) fetch("/api/staff?limit=100").then(r => r.json()).then(({ data }) => setStaff(data || []));
  }, [isAdmin]);

  const openAdd = () => {
    setEditRecord(null);
    setForm({ employeeId: "", date: new Date().toISOString().split("T")[0], status: "PRESENT", clockIn: "", clockOut: "", note: "" });
    setShowModal(true);
  };

  const openEdit = (r: any) => {
    setEditRecord(r);
    setForm({
      employeeId: String(r.employeeId),
      date: new Date(r.date).toISOString().split("T")[0],
      status: r.status,
      clockIn: r.clockIn ? new Date(r.clockIn).toTimeString().slice(0, 5) : "",
      clockOut: r.clockOut ? new Date(r.clockOut).toTimeString().slice(0, 5) : "",
      note: r.note || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.employeeId || !form.date) return toast.error("Employee and date are required");
    setSaving(true);
    try {
      const dateStr = form.date;
      const clockIn = form.clockIn ? `${dateStr}T${form.clockIn}:00` : null;
      const clockOut = form.clockOut ? `${dateStr}T${form.clockOut}:00` : null;
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, clockIn, clockOut }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Record saved");
      setShowModal(false);
      fetchRecords();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deleteRecord = async (id: number) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch("/api/attendance", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Deleted");
      fetchRecords();
    } catch (e: any) { toast.error(e.message); }
  };

  // Summary stats for the month
  const stats = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-main">Attendance</h1>
          <p className="text-text-muted text-sm mt-0.5">{records.length} records for {new Date(year, m - 1).toLocaleString("default", { month: "long", year: "numeric" })}</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="btn-primary text-sm flex-shrink-0">+ Log Attendance</button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="card p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color: STATUS_COLORS[key] }}>{stats[key] || 0}</div>
            <div className="text-[11px] text-text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="input text-sm" />
        {isAdmin && (
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="input text-sm flex-1 min-w-[160px]">
            <option value="">All Staff</option>
            {staff.map(s => <option key={s.id} value={s.employee?.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Records table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-text-muted text-sm">Loading…</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-text-muted text-sm">No attendance records for this period.</div>
            {isAdmin && <button onClick={openAdd} className="btn-primary mt-4 text-sm">Log First Record</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase">Date</th>
                  {isAdmin && <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase">Employee</th>}
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase">Clock In</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase">Clock Out</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase">Hours</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase">Note</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const hours = r.clockIn && r.clockOut
                    ? ((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 3600000).toFixed(1)
                    : null;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
                      <td className="px-4 py-3 text-[13px] text-text-main font-medium">
                        {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={r.employee?.user?.name || "?"} size={28} />
                            <div>
                              <div className="text-[12px] font-semibold text-text-main">{r.employee?.user?.name}</div>
                              <div className="text-[10px] text-text-muted">{r.employee?.department?.name}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3"><Badge status={r.status} /></td>
                      <td className="px-4 py-3 text-[12px] text-text-soft">{r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</td>
                      <td className="px-4 py-3 text-[12px] text-text-soft">{r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</td>
                      <td className="px-4 py-3 text-[12px] text-text-soft">{hours ? `${hours}h` : "--"}</td>
                      <td className="px-4 py-3 text-[12px] text-text-muted max-w-[160px] truncate">{r.note || ""}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEdit(r)} className="text-[11px] text-accent hover:underline">Edit</button>
                            <button onClick={() => deleteRecord(r.id)} className="text-[11px] text-danger hover:underline">Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={e => e.stopPropagation()} className="card p-6 w-full max-w-md space-y-4">
            <h3 className="text-[15px] font-bold text-text-main">{editRecord ? "Edit Record" : "Log Attendance"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Employee</label>
                <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} className="input w-full">
                  <option value="">Select employee…</option>
                  {staff.map(s => <option key={s.id} value={s.employee?.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input w-full" />
              </div>
              <div className="col-span-2">
                <label className="label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input w-full">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Clock In</label>
                <input type="time" value={form.clockIn} onChange={e => setForm(f => ({ ...f, clockIn: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Clock Out</label>
                <input type="time" value={form.clockOut} onChange={e => setForm(f => ({ ...f, clockOut: e.target.value }))} className="input w-full" />
              </div>
              <div className="col-span-2">
                <label className="label">Note (optional)</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Any notes…" className="input w-full" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
