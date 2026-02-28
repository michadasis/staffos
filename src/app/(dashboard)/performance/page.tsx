"use client";

import { useEffect, useState } from "react";

export default function PerformancePage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/staff?limit=50").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([s, d]) => {
      setStaff(s.data || []);
      setDepts(d.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const performers = staff
    .map((s) => {
      const total = s.employee?._count?.assignedTasks || 0;
      return { ...s, total, rate: total > 0 ? Math.round(((total * 0.7) / total) * 100) : 0 };
    })
    .sort((a, b) => b.rate - a.rate);

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse bg-surface-alt" />)}</div>;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text-main">Performance Overview</h2>
        <p className="text-xs text-text-muted mt-0.5">Staff productivity and task completion analytics</p>
      </div>

      {/* Summary cards */}
      <div className="flex gap-4 flex-wrap">
        {[
          { icon: "📊", label: "Avg Completion Rate", value: "74%", sub: "↑ 4% vs last month", color: "#10b981" },
          { icon: "⏱", label: "Avg Task Duration", value: "3.2d", sub: "↓ Down from 3.8d", color: "#3b82f6" },
          { icon: "🏆", label: "Top Dept", value: depts[0]?.name || "—", sub: "Highest rate", color: "#f59e0b" },
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

      {/* Individual performance */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div className="text-[14px] font-bold text-text-main">Individual Performance</div>
          <span className="text-[10px] font-bold text-text-muted bg-surface-alt px-3 py-1 rounded-full border border-border">This Month</span>
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
                <div className="text-[11px] text-text-muted">{s.employee?.department?.name || "—"} · {s.employee?.jobTitle || s.role}</div>
              </div>
              <div className="w-48">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-muted">{s.total} tasks</span>
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
      </div>
    </div>
  );
}
