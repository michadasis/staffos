"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DashboardStats } from "@/types";

function StatCard({ icon, label, value, sub, color = "#3b82f6" }: any) {
  return (
    <div className="card p-5 flex-1 min-w-[150px] relative overflow-hidden hover:border-accent/30 transition-colors">
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: color }} />
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-extrabold text-text-main font-mono tracking-tight">{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
      {sub && <div className="text-xs font-semibold mt-1.5" style={{ color }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data }: { data: { month: string; assigned: number; completed: number }[] }) {
  const max = Math.max(...data.map((d) => d.assigned), 1);
  return (
    <div className="flex items-end gap-2.5 h-28 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end" style={{ height: 90 }}>
            <div className="w-full rounded-t-sm" style={{ height: `${(d.assigned / max) * 90}px`, background: "#1e3a5f", position: "relative" }}>
              <div className="w-full rounded-t-sm absolute bottom-0" style={{ height: `${(d.completed / max) * 90}px`, background: "#3b82f6" }} />
            </div>
          </div>
          <span className="text-[9px] text-text-muted font-mono">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ completed, inProgress, pending }: { completed: number; inProgress: number; pending: number }) {
  const total = Math.max(completed + inProgress + pending, 1);
  const r = 44, cx = 56, cy = 56, sw = 11;
  const circ = 2 * Math.PI * r;
  const segs = [
    { val: completed, color: "#10b981" },
    { val: inProgress, color: "#3b82f6" },
    { val: pending, color: "#f59e0b" },
  ];
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={112} height={112}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth={sw} />
        {segs.map(({ val, color }, i) => {
          const pct = val / total;
          const dash = pct * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-(offset * circ)}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
          );
          offset += pct;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize={17} fontWeight={800} fontFamily="var(--font-dm-mono)">{Math.round((completed / total) * 100)}%</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#64748b" fontSize={8}>done</text>
      </svg>
      <div className="space-y-2.5">
        {[["Completed", completed, "#10b981"], ["In Progress", inProgress, "#3b82f6"], ["Pending", pending, "#f59e0b"]].map(([l, v, c]) => (
          <div key={l as string} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c as string }} />
            <span className="text-xs text-text-soft">{l}</span>
            <span className="text-xs font-bold text-text-main font-mono ml-auto pl-4">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams();
    if (user.role === "STAFF" && user.employee?.id) {
      params.set("employeeId", String(user.employee.id));
    }
    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-32 animate-pulse bg-surface-alt" />)}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-main tracking-tight">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          {isAdminOrManager ? " — Here's your company overview." : " — Here's your task overview."}
        </p>
      </div>

      {/* Stats — different for admin/manager vs staff */}
      {isAdminOrManager ? (
        <div className="flex gap-4 flex-wrap">
          <StatCard icon="👥" label="Active Staff" value={stats.activeStaff} sub={`↑ ${stats.totalStaff} total`} color="#3b82f6" />
          <StatCard icon="⏳" label="Pending Tasks" value={stats.pendingTasks} sub="⚠ Needs attention" color="#f59e0b" />
          <StatCard icon="⚡" label="In Progress" value={stats.inProgressTasks} sub="✓ On track" color="#3b82f6" />
          <StatCard icon="✅" label="Completed" value={stats.completedTasks} sub="↑ Great work!" color="#10b981" />
        </div>
      ) : (
        <div className="flex gap-4 flex-wrap">
          <StatCard icon="⏳" label="My Pending" value={stats.pendingTasks} sub="To do" color="#f59e0b" />
          <StatCard icon="⚡" label="My In Progress" value={stats.inProgressTasks} sub="Keep going!" color="#3b82f6" />
          <StatCard icon="✅" label="My Completed" value={stats.completedTasks} sub="Great work!" color="#10b981" />
        </div>
      )}

      {/* Charts — admin/manager only */}
      {isAdminOrManager && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 md:col-span-2">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[14px] font-bold text-text-main">Task Activity</div>
                <div className="text-xs text-text-muted mt-0.5">Assigned vs Completed (6 months)</div>
              </div>
              <div className="flex gap-3">
                {[["Assigned", "#1e3a5f"], ["Completed", "#3b82f6"]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                    <span className="text-[10px] text-text-muted">{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <BarChart data={stats.tasksByMonth} />
          </div>
          <div className="card p-5">
            <div className="text-[14px] font-bold text-text-main mb-0.5">Task Status</div>
            <div className="text-xs text-text-muted mb-4">Overall distribution</div>
            <DonutChart
              completed={stats.completedTasks}
              inProgress={stats.inProgressTasks}
              pending={stats.pendingTasks}
            />
          </div>
        </div>
      )}

      {/* Staff task status chart — for staff members */}
      {!isAdminOrManager && (
        <div className="card p-5 max-w-sm">
          <div className="text-[14px] font-bold text-text-main mb-0.5">My Task Status</div>
          <div className="text-xs text-text-muted mb-4">Your task breakdown</div>
          <DonutChart
            completed={stats.completedTasks}
            inProgress={stats.inProgressTasks}
            pending={stats.pendingTasks}
          />
        </div>
      )}

      {/* Bottom panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top performers — admin/manager only */}
        {isAdminOrManager && (
          <div className="card p-5">
            <div className="text-[14px] font-bold text-text-main mb-4">Top Performers</div>
            <div className="space-y-3.5">
              {stats.topPerformers.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-text-muted font-mono w-4 text-center">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-text-main truncate">{p.name}</div>
                    <div className="h-1.5 bg-border rounded-full mt-1">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${p.rate}%` }} />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-accent font-mono">{p.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Department overview — admin/manager only */}
        {isAdminOrManager && (
          <div className="card p-5">
            <div className="text-[14px] font-bold text-text-main mb-4">Department Overview</div>
            <div className="space-y-3.5">
              {stats.departmentStats.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-24 text-[12px] text-text-soft shrink-0">{d.name}</div>
                  <div className="flex-1 h-2 bg-border rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${d.rate}%`, background: "linear-gradient(to right, #3b82f6, #10b981)" }} />
                  </div>
                  <span className="text-[11px] font-bold text-text-main font-mono w-9 text-right">{d.rate}%</span>
                  <span className="text-[10px] text-text-muted w-5">{d.count}p</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My recent tasks — staff only */}
        {!isAdminOrManager && (
          <div className="card p-5 md:col-span-2">
            <div className="text-[14px] font-bold text-text-main mb-4">My Recent Tasks</div>
            <p className="text-sm text-text-muted">Head to the <span className="text-accent font-semibold">Tasks</span> page to view and update your assigned tasks.</p>
            <div className="mt-4 flex gap-3">
              <a href="/tasks" className="btn-primary text-sm">View My Tasks →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
