"use client";

import { useEffect, useState } from "react";

export default function PerformancePage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/staff?limit=50").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/tasks?limit=200").then((r) => r.json()),
    ]).then(([s, d, t]) => {
      setStaff(s.data || []);
      setDepts(d.data || []);
      setTasks(t.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // Compute real stats from actual task data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const avgCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Top department by real completion rate
  const deptStats = depts.map((d: any) => {
    const deptTasks = tasks.filter((t) => t.department?.id === d.id);
    const deptDone = deptTasks.filter((t) => t.status === "COMPLETED").length;
    const rate = deptTasks.length > 0 ? Math.round((deptDone / deptTasks.length) * 100) : 0;
    const staffCount = staff.filter((s) => s.employee?.department?.id === d.id).length;
    return { ...d, rate, total: deptTasks.length, done: deptDone, staffCount };
  }).sort((a, b) => b.rate - a.rate);

  const topDept = deptStats[0]?.name || "—";

  // Per-staff completion rate using real task data
  const performers = staff.map((s) => {
    const empTasks = tasks.filter((t) => t.assignee?.user?.name === s.name);
    const empDone = empTasks.filter((t) => t.status === "COMPLETED").length;
    const rate = empTasks.length > 0 ? Math.round((empDone / empTasks.length) * 100) : 0;
    return { ...s, empTotal: empTasks.length, empDone, rate };
  }).sort((a, b) => b.rate - a.rate);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse bg-surface-alt" />)}
    </div>
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text-main">Performance Overview</h2>
        <p className="text-xs text-text-muted mt-0.5">Staff productivity and task completion analytics</p>
      </div>

      {/* Summary cards — all real data */}
      <div className="flex gap-4 flex-wrap">
        {[
          {
            icon: "📊",
            label: "Avg Completion Rate",
            value: `${avgCompletionRate}%`,
            sub: `${completedTasks} of ${totalTasks} tasks done`,
            color: "#10b981",
          },
          {
            icon: "✅",
            label: "Completed Tasks",
            value: completedTasks,
            sub: `${totalTasks - completedTasks} remaining`,
            color: "#3b82f6",
          },
          {
            icon: "🏆",
            label: "Top Department",
            value: topDept,
            sub: `${deptStats[0]?.rate ?? 0}% completion rate`,
            color: "#f59e0b",
          },
        ].map((c) => (
          <div key={c.label} className="card p-5 flex-1 min-w-[160px] relative overflow-hidden hover:border-accent/30 transition-colors">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: c.color }} />
            <div className="text-2xl mb-3">{c.icon}</div>
            <div className="text-2xl font-extrabold text-text-main font-mono">{c.value}</div>
            <div className="text-xs text-text-muted mt-1">{c.label}</div>
            <div className="text-xs font-semibold mt-1" style={{ color: c.color }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Individual performance — real data */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div className="text-[14px] font-bold text-text-main">Individual Performance</div>
          <span className="text-[10px] font-bold text-text-muted bg-surface-alt px-3 py-1 rounded-full border border-border">
            {totalTasks} total tasks
          </span>
        </div>
        {performers.map((s, i) => {
          const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
          const bg = colors[s.name.charCodeAt(0) % colors.length];
          const rateColor = s.rate >= 80 ? "#10b981" : s.rate >= 50 ? "#3b82f6" : "#f59e0b";
          return (
            <div key={s.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-surface-alt transition-colors ${i < performers.length - 1 ? "border-b border-border" : ""}`}>
              <span className="text-[11px] text-text-muted font-mono w-5 text-center">{i + 1}</span>
              <div style={{ background: bg }} className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 font-mono">
                {s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-main">{s.name}</div>
                <div className="text-[11px] text-text-muted">
                  {s.employee?.department?.name || "—"} · {s.empDone}/{s.empTotal} tasks completed
                </div>
              </div>
              <div className="w-48">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-muted">{s.empTotal} assigned</span>
                  <span className="font-bold font-mono" style={{ color: rateColor }}>{s.rate}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full">
                  <div className="h-full rounded-full transition-all" style={{ width: `${s.rate}%`, background: rateColor }} />
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border
                ${s.employee?.status === "ACTIVE" ? "text-success bg-success/10 border-success/20" :
                  s.employee?.status === "ON_LEAVE" ? "text-warning bg-warning/10 border-warning/20" :
                  "text-danger bg-danger/10 border-danger/20"}`}>
                {(s.employee?.status || "ACTIVE").replace("_", " ")}
              </span>
            </div>
          );
        })}
        {performers.length === 0 && (
          <div className="p-10 text-center text-text-muted text-sm">No staff data available</div>
        )}
      </div>

      {/* Department performance — real data */}
      <div className="card p-6">
        <div className="text-[14px] font-bold text-text-main mb-5">Department Performance</div>
        {deptStats.length === 0 ? (
          <div className="text-sm text-text-muted text-center py-4">No department data available</div>
        ) : (
          <div className="space-y-4">
            {deptStats.map((d) => (
              <div key={d.id} className="flex items-center gap-4">
                <div className="w-28 text-[12px] text-text-soft flex-shrink-0">{d.name}</div>
                <div className="flex-1 h-2 bg-border rounded-full">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${d.rate}%`, background: "linear-gradient(to right, #3b82f6, #10b981)" }} />
                </div>
                <div className="w-10 text-right text-[12px] font-bold font-mono text-text-main">{d.rate}%</div>
                <div className="w-16 text-[11px] text-text-muted">{d.done}/{d.total} tasks</div>
                <div className="w-8 text-[11px] text-text-muted">{d.staffCount}p</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
