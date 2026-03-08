"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

const TYPE_LABELS: Record<string, string> = { ANNUAL: "Annual", SICK: "Sick", UNPAID: "Unpaid", MATERNITY: "Maternity", PATERNITY: "Paternity", OTHER: "Other" };
const TYPE_COLORS: Record<string, string> = { ANNUAL: "#22c55e", SICK: "#ef4444", UNPAID: "#64748b", MATERNITY: "#ec4899", PATERNITY: "#3b82f6", OTHER: "#8b5cf6" };
const STATUS_COLORS: Record<string, string> = { PENDING: "#eab308", APPROVED: "#22c55e", REJECTED: "#ef4444", CANCELLED: "#64748b" };

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff" }}>
      {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

export default function LeavePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [reviewModal, setReviewModal] = useState<any>(null);
  const [form, setForm] = useState({ type: "ANNUAL", startDate: "", endDate: "", reason: "", employeeId: "" });
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/leave?${params}`);
      const { data } = await res.json();
      setRequests(data || []);
    } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    if (isAdmin) fetch("/api/staff?limit=100").then(r => r.json()).then(({ data }) => setStaff(data || []));
  }, [isAdmin]);

  const submit = async () => {
    if (!form.startDate || !form.endDate) return toast.error("Start and end dates are required");
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Leave request submitted");
      setShowModal(false);
      setForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "", employeeId: "" });
      fetch_();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const review = async (action: "approve" | "reject") => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewModal.id, action, reviewNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
      setReviewModal(null);
      setReviewNote("");
      fetch_();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const cancel = async (id: number) => {
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Request cancelled");
      fetch_();
    } catch (e: any) { toast.error(e.message); }
  };

  const pending = requests.filter(r => r.status === "PENDING");
  const stats = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-main">Leave Management</h1>
          <p className="text-text-muted text-sm mt-0.5">{isAdmin ? `${pending.length} pending request${pending.length !== 1 ? "s" : ""}` : "Your leave requests"}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex-shrink-0">+ Request Leave</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["CANCELLED", "Cancelled"]].map(([k, l]) => (
          <div key={k} className="card p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color: STATUS_COLORS[k] }}>{stats[k] || 0}</div>
            <div className="text-[11px] text-text-muted mt-1">{l}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card p-4 flex gap-3 flex-wrap">
        {["", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors border ${filterStatus === s ? "bg-accent text-white border-accent" : "text-text-muted border-border hover:bg-surface-alt"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Requests */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-text-muted text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🌴</div>
            <div className="text-text-muted text-sm">No leave requests found.</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {requests.map(r => {
              const typeColor = TYPE_COLORS[r.type] || "#64748b";
              const statusColor = STATUS_COLORS[r.status] || "#64748b";
              return (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={r.employee?.user?.name || "?"} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && <span className="text-[13px] font-bold text-text-main">{r.employee?.user?.name}</span>}
                        <span style={{ background: typeColor + "20", color: typeColor, border: `1px solid ${typeColor}30`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                          {TYPE_LABELS[r.type]}
                        </span>
                        <span style={{ background: statusColor + "20", color: statusColor, border: `1px solid ${statusColor}30`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                          {r.status}
                        </span>
                      </div>
                      <div className="text-[12px] text-text-muted mt-0.5">
                        {new Date(r.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — {new Date(r.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {r.days} working day{r.days !== 1 ? "s" : ""}
                      </div>
                      {r.reason && <div className="text-[11px] text-text-muted mt-0.5 truncate">{r.reason}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isAdmin && r.status === "PENDING" && (
                      <button onClick={() => { setReviewModal(r); setReviewNote(""); }}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors">
                        Review
                      </button>
                    )}
                    {!isAdmin && r.status === "PENDING" && (
                      <button onClick={() => cancel(r.id)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={e => e.stopPropagation()} className="card p-6 w-full max-w-md space-y-4">
            <h3 className="text-[15px] font-bold text-text-main">Request Leave</h3>
            {isAdmin && (
              <div>
                <label className="label">Employee</label>
                <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} className="input w-full">
                  <option value="">Myself</option>
                  {staff.map(s => <option key={s.id} value={s.employee?.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Leave Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input w-full">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input w-full" />
              </div>
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Reason for leave…" className="input w-full resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={submit} disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">{submitting ? "Submitting…" : "Submit Request"}</button>
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div onClick={() => setReviewModal(null)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={e => e.stopPropagation()} className="card p-6 w-full max-w-md space-y-4">
            <h3 className="text-[15px] font-bold text-text-main">Review Leave Request</h3>
            <div className="bg-surface-alt rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Avatar name={reviewModal.employee?.user?.name} size={28} />
                <span className="text-[13px] font-semibold text-text-main">{reviewModal.employee?.user?.name}</span>
              </div>
              <div className="text-[12px] text-text-muted">{TYPE_LABELS[reviewModal.type]} leave</div>
              <div className="text-[12px] text-text-muted">
                {new Date(reviewModal.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — {new Date(reviewModal.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ({reviewModal.days} days)
              </div>
              {reviewModal.reason && <div className="text-[12px] text-text-soft pt-1">{reviewModal.reason}</div>}
            </div>
            <div>
              <label className="label">Review Note (optional)</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Optional note to employee…" className="input w-full resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => review("approve")} disabled={submitting} className="flex-1 text-sm font-bold py-2.5 rounded-xl bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors disabled:opacity-50">
                Approve
              </button>
              <button onClick={() => review("reject")} disabled={submitting} className="flex-1 text-sm font-bold py-2.5 rounded-xl bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors disabled:opacity-50">
                Reject
              </button>
              <button onClick={() => setReviewModal(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
