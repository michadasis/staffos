"use client";

import { useEffect, useState } from "react";

export default function ReportsPage() {
  const [period, setPeriod] = useState("monthly");
  const [staffReport, setStaffReport] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/reports?type=staff&period=${period}`).then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([s, d]) => {
      setStaffReport(s.data || []);
      setDepts(d.data || []);
    }).finally(() => setLoading(false));
  }, [period]);

  const exportCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(",");
    const rows = data.map((r) => Object.values(r).map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-text-main">Reports & Analytics</h2>
          <p className="text-xs text-text-muted mt-0.5">Generate and export workforce reports</p>
        </div>
        <div className="flex gap-2">
          {["daily", "weekly", "monthly"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border capitalize transition-colors
                ${period === p ? "bg-accent text-white border-accent" : "bg-surface text-text-muted border-border hover:border-accent/40"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Staff Summary", desc: "All staff, roles, departments & statuses", icon: "👥", color: "#3b82f6", type: "staff" },
          { title: "Task Completion", desc: "Tasks by status, priority & deadline", icon: "✅", color: "#10b981", type: "tasks" },
          { title: "Performance", desc: "Individual & team performance scores", icon: "📈", color: "#f59e0b", type: "performance" },
          { title: "Department Overview", desc: "Cross-dept workload & efficiency", icon: "🏢", color: "#8b5cf6", type: "dept" },
        ].map((r) => (
          <div key={r.title} className="card p-5">
            <div className="text-2xl mb-3">{r.icon}</div>
            <div className="text-[14px] font-bold text-text-main mb-1">{r.title}</div>
            <div className="text-[11px] text-text-muted mb-4">{r.desc}</div>
            <div className="flex gap-2">
              <button onClick={() => staffReport.length && exportCSV(staffReport, `staffos-${r.type}`)}
                className="flex-1 text-[11px] font-bold py-1.5 rounded-lg border transition-colors"
                style={{ color: r.color, background: r.color + "15", borderColor: r.color + "30" }}>
                📊 CSV
              </button>
              <button className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-border bg-surface-alt text-text-soft hover:text-text-main transition-colors">
                🖨 Print
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Staff table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div className="text-[14px] font-bold text-text-main">Staff Report — {period.charAt(0).toUpperCase() + period.slice(1)}</div>
          <button onClick={() => staffReport.length && exportCSV(staffReport, "staffos-staff-report")}
            className="text-xs font-semibold text-accent hover:underline">Export CSV →</button>
        </div>
        {loading ? (
          <div className="p-6 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-surface-alt rounded animate-pulse" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-[1.5fr_1.5fr_0.8fr_0.8fr_0.6fr_0.6fr_0.6fr] px-6 py-2.5 border-b border-border">
              {["Name", "Email", "Role", "Department", "Status", "Tasks", "Rate"].map((h) => (
                <div key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{h}</div>
              ))}
            </div>
            {staffReport.map((s, i) => (
              <div key={i} className={`grid grid-cols-[1.5fr_1.5fr_0.8fr_0.8fr_0.6fr_0.6fr_0.6fr] px-6 py-3 items-center hover:bg-surface-alt transition-colors ${i < staffReport.length - 1 ? "border-b border-border" : ""}`}>
                <div className="text-[12px] font-semibold text-text-main">{s.name}</div>
                <div className="text-[11px] text-text-muted truncate">{s.email}</div>
                <div className="text-[11px] text-text-soft">{s.role}</div>
                <div className="text-[11px] text-text-soft">{s.department || "—"}</div>
                <span className={`text-[10px] font-bold w-fit px-2 py-0.5 rounded-full border
                  ${s.status === "ACTIVE" ? "text-success bg-success/10 border-success/20" :
                    s.status === "ON_LEAVE" ? "text-warning bg-warning/10 border-warning/20" :
                    "text-danger bg-danger/10 border-danger/20"}`}>
                  {s.status?.replace("_", " ")}
                </span>
                <div className="text-[11px] font-mono text-text-main">{s.tasksTotal}</div>
                <div className="text-[11px] font-bold font-mono" style={{ color: s.completionRate >= 80 ? "#10b981" : s.completionRate >= 50 ? "#3b82f6" : "#f59e0b" }}>
                  {s.completionRate}%
                </div>
              </div>
            ))}
            {staffReport.length === 0 && <div className="p-8 text-center text-text-muted text-sm">No data available</div>}
          </>
        )}
      </div>

      {/* Dept performance */}
      <div className="card p-6">
        <div className="text-[14px] font-bold text-text-main mb-5">Department Performance</div>
        <div className="space-y-4">
          {depts.map((d: any) => {
            const rate = Math.floor(Math.random() * 40 + 60); // placeholder until dept stats endpoint
            return (
              <div key={d.id} className="flex items-center gap-4">
                <div className="w-28 text-[12px] text-text-soft flex-shrink-0">{d.name}</div>
                <div className="flex-1 h-2 bg-border rounded-full">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: "linear-gradient(to right, #3b82f6, #10b981)" }} />
                </div>
                <div className="w-10 text-right text-[12px] font-bold font-mono text-text-main">{rate}%</div>
                <div className="w-8 text-[11px] text-text-muted">{d._count?.employees || 0}p</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
