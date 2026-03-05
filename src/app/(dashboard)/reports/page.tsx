"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

// ── helpers ────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-2">{label}</div>
      <div className="text-2xl font-extrabold text-text-main" style={color ? { color } : {}}>{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-1">{sub}</div>}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "text-success bg-success/10 border-success/20",
  IN_PROGRESS: "text-accent bg-accent/10 border-accent/20",
  PENDING: "text-warning bg-warning/10 border-warning/20",
  CANCELLED: "text-text-muted bg-surface border-border",
};
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-400/10 border-red-400/20",
  HIGH: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  MEDIUM: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  LOW: "text-success bg-success/10 border-success/20",
};

// ── export helpers ──────────────────────────────────────────────────────────────

async function exportExcel(report: any, period: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ["StaffOS Report", `Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`],
    ["Generated", new Date(report.generatedAt).toLocaleString()],
    [],
    ["Metric", "Value"],
    ["Total Staff",       report.summary.totalStaff],
    ["Active Staff",      report.summary.activeStaff],
    ["Total Tasks",       report.summary.totalTasks],
    ["Completed Tasks",   report.summary.completedTasks],
    ["Overall Rate",      `${report.summary.overallRate}%`],
    ["Messages Sent",     report.summary.messagesSent],
    ["Departments",       report.summary.departments],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

  // Staff sheet
  if (report.staffRows?.length) {
    const staffHeaders = ["Name","Email","Role","Department","Status","Join Date","Total Tasks","Completed","Period Tasks","Overdue","Completion Rate"];
    const staffData = report.staffRows.map((r: any) => [
      r.name, r.email, r.role, r.department, r.status, r.joinDate,
      r.tasksTotal, r.tasksCompleted, r.tasksPeriod, r.overdueTasks, `${r.completionRate}%`
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([staffHeaders, ...staffData]), "Staff");
  }

  // Tasks sheet
  if (report.taskRows?.length) {
    const taskHeaders = ["Title","Status","Priority","Assignee","Department","Created By","Deadline","Comments","Created At"];
    const taskData = report.taskRows.map((r: any) => [
      r.title, r.status, r.priority, r.assignee, r.department, r.createdBy, r.deadline, r.comments, r.createdAt
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([taskHeaders, ...taskData]), "Tasks");
  }

  // Departments sheet
  if (report.deptStats?.length) {
    const deptHeaders = ["Department","Staff","Total Tasks","Completed","Overdue","Completion Rate"];
    const deptData = report.deptStats.map((d: any) => [
      d.name, d.staffCount, d.tasksTotal, d.tasksCompleted, d.overdueTasks, `${d.completionRate}%`
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([deptHeaders, ...deptData]), "Departments");
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `staffos-report-${period}-${timestamp}.xlsx`);
  toast.success("Excel report downloaded");
}

async function exportPDF(report: any, period: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
  const generatedAt = new Date(report.generatedAt).toLocaleString();
  const pageW = doc.internal.pageSize.getWidth();

  const addHeader = (title: string) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("StaffOS", 10, 11);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(title, pageW / 2, 11, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 180);
    doc.text(`${periodLabel} · Generated ${generatedAt}`, pageW - 10, 11, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  // ── Page 1: Summary ──────────────────────────────────────────────────────────
  addHeader(`${periodLabel} Report — Summary`);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 50);
  doc.text("Overview", 10, 30);

  const summaryRows = [
    ["Total Staff", String(report.summary.totalStaff), "Active Staff", String(report.summary.activeStaff)],
    ["Total Tasks", String(report.summary.totalTasks), "Completed Tasks", String(report.summary.completedTasks)],
    ["Overall Completion", `${report.summary.overallRate}%`, "Messages Sent", String(report.summary.messagesSent)],
    ["Departments", String(report.summary.departments), "", ""],
  ];

  autoTable(doc, {
    startY: 34,
    body: summaryRows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [245, 247, 255] }, 2: { fontStyle: "bold", fillColor: [245, 247, 255] } },
    margin: { left: 10, right: 10 },
  });

  // Task breakdown
  const taskBreakdown = [
    ["Pending", String(report.taskSummary?.pending || 0)],
    ["In Progress", String(report.taskSummary?.inProgress || 0)],
    ["Completed", String(report.taskSummary?.completed || 0)],
    ["Cancelled", String(report.taskSummary?.cancelled || 0)],
    ["Overdue", String(report.taskSummary?.overdue || 0)],
    ["Critical Priority", String(report.taskSummary?.critical || 0)],
  ];

  const afterY = (doc as any).lastAutoTable?.finalY || 80;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Task Breakdown", 10, afterY + 12);

  autoTable(doc, {
    startY: afterY + 16,
    head: [["Status / Priority", "Count"]],
    body: taskBreakdown,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
    margin: { left: 10, right: pageW / 2 + 5 },
  });

  // ── Page 2: Staff ────────────────────────────────────────────────────────────
  if (report.staffRows?.length) {
    doc.addPage();
    addHeader("Staff Report");

    autoTable(doc, {
      startY: 24,
      head: [["Name", "Email", "Role", "Department", "Status", "Total Tasks", "Completed", "Overdue", "Rate"]],
      body: report.staffRows.map((r: any) => [
        r.name, r.email, r.role, r.department, r.status,
        r.tasksTotal, r.tasksCompleted, r.overdueTasks, `${r.completionRate}%`
      ]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 8: { fontStyle: "bold" } },
      margin: { left: 10, right: 10 },
    });
  }

  // ── Page 3: Tasks ─────────────────────────────────────────────────────────────
  if (report.taskRows?.length) {
    doc.addPage();
    addHeader("Task Report");

    autoTable(doc, {
      startY: 24,
      head: [["Title", "Status", "Priority", "Assignee", "Department", "Deadline", "Comments"]],
      body: report.taskRows.map((r: any) => [
        r.title, r.status.replace("_"," "), r.priority, r.assignee, r.department, r.deadline, r.comments
      ]),
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold", fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 10, right: 10 },
    });
  }

  // ── Page 4: Departments ───────────────────────────────────────────────────────
  if (report.deptStats?.length) {
    doc.addPage();
    addHeader("Department Report");

    autoTable(doc, {
      startY: 24,
      head: [["Department", "Staff", "Total Tasks", "Completed", "Overdue", "Completion Rate"]],
      body: report.deptStats.map((d: any) => [
        d.name, d.staffCount, d.tasksTotal, d.tasksCompleted, d.overdueTasks, `${d.completionRate}%`
      ]),
      theme: "striped",
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: "bold", fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 5: { fontStyle: "bold" } },
      margin: { left: 10, right: 10 },
    });
  }

  // Page numbers
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 180);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 10, doc.internal.pageSize.getHeight() - 5, { align: "right" });
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`staffos-report-${period}-${timestamp}.pdf`);
  toast.success("PDF report downloaded");
}

// ── page ────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("monthly");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "tasks" | "departments">("overview");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?type=full&period=${period}`)
      .then((r) => r.json())
      .then(({ data }) => setReport(data))
      .finally(() => setLoading(false));
  }, [period]);

  const handleExport = async (format: "pdf" | "excel") => {
    if (!report) return;
    setExporting(format);
    try {
      if (format === "pdf")   await exportPDF(report, period);
      if (format === "excel") await exportExcel(report, period);
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setExporting(null);
    }
  };

  const s = report?.summary;
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-text-main">Reports & Analytics</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {report ? `Generated ${new Date(report.generatedAt).toLocaleString()}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period toggle */}
          <div className="flex gap-1.5">
            {["daily","weekly","monthly"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs font-semibold px-3.5 py-2 rounded-xl border capitalize transition-colors
                  ${period === p ? "bg-accent text-white border-accent" : "bg-surface text-text-muted border-border hover:border-accent/40"}`}>
                {p}
              </button>
            ))}
          </div>
          {/* Export buttons */}
          <button
            onClick={() => handleExport("excel")}
            disabled={!report || !!exporting}
            className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-xl border border-success/30 text-success bg-success/5 hover:bg-success/10 transition-colors disabled:opacity-50">
            {exporting === "excel" ? <span className="w-3 h-3 border border-success/30 border-t-success rounded-full animate-spin" /> : "⬇"}
            Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={!report || !!exporting}
            className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-xl border border-danger/30 text-danger bg-danger/5 hover:bg-danger/10 transition-colors disabled:opacity-50">
            {exporting === "pdf" ? <span className="w-3 h-3 border border-danger/30 border-t-danger rounded-full animate-spin" /> : "⬇"}
            PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_,i) => <div key={i} className="card h-24 animate-pulse bg-surface-alt" />)}
        </div>
      ) : s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Staff"        value={s.totalStaff}      sub={`${s.activeStaff} active`} />
          <StatCard label="Total Tasks"        value={s.totalTasks}      sub={`${periodLabel} period`} />
          <StatCard label="Completed Tasks"    value={s.completedTasks}  sub={`${s.overallRate}% rate`} color={s.overallRate >= 70 ? "#10b981" : "#f59e0b"} />
          <StatCard label="Completion Rate"    value={`${s.overallRate}%`} color={s.overallRate >= 70 ? "#10b981" : s.overallRate >= 40 ? "#3b82f6" : "#ef4444"} />
          <StatCard label="Overdue Tasks"      value={report.taskSummary?.overdue || 0} color={report.taskSummary?.overdue > 0 ? "#ef4444" : "#10b981"} />
          <StatCard label="In Progress"        value={report.taskSummary?.inProgress || 0} color="#3b82f6" />
          <StatCard label="Messages Sent"      value={s.messagesSent}    sub={`${periodLabel} period`} />
          <StatCard label="Departments"        value={s.departments} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border pb-0 flex-wrap">
        {(["overview","staff","tasks","departments"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`text-[12px] font-semibold px-4 py-2.5 capitalize border-b-2 transition-colors -mb-px
              ${activeTab === t ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-soft"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="card h-12 animate-pulse bg-surface-alt" />)}</div>
      ) : !report ? null : (

        <>
          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Task status breakdown */}
              <div className="card p-5">
                <div className="text-[13px] font-bold text-text-main mb-4">Task Status Breakdown</div>
                <div className="space-y-3">
                  {[
                    { label: "Completed",   value: report.taskSummary?.completed,  color: "#10b981" },
                    { label: "In Progress", value: report.taskSummary?.inProgress, color: "#3b82f6" },
                    { label: "Pending",     value: report.taskSummary?.pending,    color: "#f59e0b" },
                    { label: "Cancelled",   value: report.taskSummary?.cancelled,  color: "#6b7280" },
                    { label: "Overdue",     value: report.taskSummary?.overdue,    color: "#ef4444" },
                  ].map(({ label, value, color }) => {
                    const pct = report.summary.totalTasks > 0 ? Math.round((value / report.summary.totalTasks) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-20 text-[11px] text-text-muted flex-shrink-0">{label}</div>
                        <div className="flex-1 h-2 bg-border rounded-full">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div className="w-14 text-right text-[11px] font-mono text-text-main">{value} <span className="text-text-muted">({pct}%)</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department overview */}
              <div className="card p-5">
                <div className="text-[13px] font-bold text-text-main mb-4">Department Completion</div>
                <div className="space-y-3">
                  {report.deptStats?.length === 0 && <div className="text-sm text-text-muted text-center py-4">No data</div>}
                  {report.deptStats?.sort((a: any, b: any) => b.completionRate - a.completionRate).map((d: any) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-24 text-[11px] text-text-soft truncate flex-shrink-0">{d.name}</div>
                      <div className="flex-1 h-2 bg-border rounded-full">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${d.completionRate}%`, background: "linear-gradient(to right, #3b82f6, #10b981)" }} />
                      </div>
                      <div className="w-10 text-right text-[11px] font-bold font-mono" style={{ color: d.completionRate >= 70 ? "#10b981" : d.completionRate >= 40 ? "#f59e0b" : "#ef4444" }}>
                        {d.completionRate}%
                      </div>
                      <div className="w-16 text-[10px] text-text-muted text-right">{d.tasksCompleted}/{d.tasksTotal}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Staff tab */}
          {activeTab === "staff" && (
            <div className="card overflow-x-auto">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="text-[13px] font-bold text-text-main">Staff — {periodLabel}</div>
                <span className="text-[11px] text-text-muted">{report.staffRows?.length} members</span>
              </div>
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Name","Department","Role","Status","Tasks","Completed","Overdue","Rate"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.staffRows?.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-surface-alt transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-[12px] font-semibold text-text-main">{r.name}</div>
                        <div className="text-[10px] text-text-muted">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-text-soft">{r.department}</td>
                      <td className="px-4 py-3 text-[11px] text-text-soft">{r.role}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.status === "ACTIVE" ? "text-success bg-success/10 border-success/20" : r.status === "ON_LEAVE" ? "text-warning bg-warning/10 border-warning/20" : "text-danger bg-danger/10 border-danger/20"}`}>
                          {r.status.replace("_"," ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-text-main">{r.tasksTotal}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-success">{r.tasksCompleted}</td>
                      <td className="px-4 py-3 text-[11px] font-mono" style={{ color: r.overdueTasks > 0 ? "#ef4444" : "#10b981" }}>{r.overdueTasks}</td>
                      <td className="px-4 py-3 text-[12px] font-bold font-mono" style={{ color: r.completionRate >= 70 ? "#10b981" : r.completionRate >= 40 ? "#f59e0b" : "#ef4444" }}>{r.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!report.staffRows?.length && <div className="p-10 text-center text-text-muted text-sm">No staff data</div>}
            </div>
          )}

          {/* Tasks tab */}
          {activeTab === "tasks" && (
            <div className="card overflow-x-auto">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="text-[13px] font-bold text-text-main">Tasks — {periodLabel}</div>
                <span className="text-[11px] text-text-muted">{report.taskRows?.length} tasks</span>
              </div>
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Title","Status","Priority","Assignee","Department","Deadline","Comments"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.taskRows?.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-surface-alt transition-colors">
                      <td className="px-4 py-3 text-[12px] font-semibold text-text-main max-w-[180px] truncate">{r.title}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] || ""}`}>{r.status.replace("_"," ")}</span></td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[r.priority] || ""}`}>{r.priority}</span></td>
                      <td className="px-4 py-3 text-[11px] text-text-soft">{r.assignee}</td>
                      <td className="px-4 py-3 text-[11px] text-text-soft">{r.department}</td>
                      <td className="px-4 py-3 text-[11px] text-text-muted">{r.deadline}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-text-muted">{r.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!report.taskRows?.length && <div className="p-10 text-center text-text-muted text-sm">No tasks in this period</div>}
            </div>
          )}

          {/* Departments tab */}
          {activeTab === "departments" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <div className="text-[13px] font-bold text-text-main">Department Report</div>
              </div>
              <div className="divide-y divide-border">
                {report.deptStats?.map((d: any) => (
                  <div key={d.name} className="px-5 py-4 hover:bg-surface-alt transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-[13px] font-bold text-text-main">{d.name}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">{d.staffCount} staff · {d.tasksTotal} tasks · {d.overdueTasks} overdue</div>
                      </div>
                      <div className="text-2xl font-extrabold font-mono" style={{ color: d.completionRate >= 70 ? "#10b981" : d.completionRate >= 40 ? "#f59e0b" : "#ef4444" }}>
                        {d.completionRate}%
                      </div>
                    </div>
                    <div className="h-2 bg-border rounded-full">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${d.completionRate}%`, background: "linear-gradient(to right, #3b82f6, #10b981)" }} />
                    </div>
                    <div className="flex gap-4 mt-2">
                      <span className="text-[10px] text-success">{d.tasksCompleted} completed</span>
                      <span className="text-[10px] text-text-muted">{d.tasksTotal - d.tasksCompleted} remaining</span>
                      {d.overdueTasks > 0 && <span className="text-[10px] text-danger">{d.overdueTasks} overdue</span>}
                    </div>
                  </div>
                ))}
                {!report.deptStats?.length && <div className="p-10 text-center text-text-muted text-sm">No department data</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
