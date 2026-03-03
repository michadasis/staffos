"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

const TABLES = [
  { key: "users",                label: "Users",                 description: "All user accounts and roles" },
  { key: "employees",            label: "Employees",             description: "Staff profiles and departments" },
  { key: "departments",          label: "Departments",           description: "Organisational departments" },
  { key: "tasks",                label: "Tasks",                 description: "All tasks with assignments" },
  { key: "taskComments",         label: "Task Comments",         description: "Discussion threads (file data excluded)" },
  { key: "messages",             label: "Messages",              description: "Direct messages between users" },
  { key: "auditLogs",            label: "Audit Logs",            description: "Security and action audit trail" },
  { key: "performanceReports",   label: "Performance Reports",   description: "Monthly performance snapshots" },
  { key: "emailChangeRequests",  label: "Email Change Requests", description: "Email change request history" },
];

export default function BackupPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (format: "json" | "csv", table = "all") => {
    const key = `${format}-${table}`;
    setDownloading(key);
    try {
      const params = new URLSearchParams({ format, table });
      const res = await fetch(`/api/backup?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Backup failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `staffos-backup.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDownloading(null);
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-20 text-text-muted">Only admins can access the backup system.</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text-main">Data Backup</h2>
        <p className="text-xs text-text-muted mt-0.5">Export your data for safekeeping or migration. Only admins can create backups.</p>
      </div>

      {/* Full backup */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[14px] font-bold text-text-main mb-1">Full System Backup</div>
            <p className="text-[12px] text-text-muted max-w-md">
              Downloads a complete snapshot of all tables as a single JSON file. Includes metadata with record counts and export timestamp. File attachments from task comments are excluded to keep the file size manageable.
            </p>
          </div>
          <button
            onClick={() => download("json", "all")}
            disabled={!!downloading}
            className="btn-primary flex items-center gap-2 flex-shrink-0 disabled:opacity-50">
            {downloading === "json-all" ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
            ) : "Download JSON Backup"}
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">What is included</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-2">
            {TABLES.map((t) => (
              <div key={t.key} className="flex items-center gap-2 text-[11px] text-text-soft">
                <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual CSV exports */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-[14px] font-bold text-text-main">Export Individual Tables as CSV</div>
          <p className="text-[12px] text-text-muted mt-0.5">Download any table as a CSV file, compatible with Excel and Google Sheets.</p>
        </div>
        <div className="divide-y divide-border">
          {TABLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-alt transition-colors gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-main">{t.label}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{t.description}</div>
              </div>
              <button
                onClick={() => download("csv", t.key)}
                disabled={!!downloading}
                className="text-[11px] font-bold px-3.5 py-2 rounded-xl border border-accent/30 text-accent hover:bg-accent/10 transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50">
                {downloading === `csv-${t.key}` ? (
                  <><span className="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" /> Exporting...</>
                ) : "Export CSV"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-warning/5 border border-warning/20 rounded-2xl px-5 py-4">
        <div className="text-[12px] font-bold text-warning mb-1">Important Notes</div>
        <ul className="text-[11px] text-text-muted space-y-1 list-disc list-inside">
          <li>Passwords are stored as bcrypt hashes and are never exported in plain text</li>
          <li>2FA secrets are not included in exports for security reasons</li>
          <li>File attachments from task comments are excluded due to size; download them individually from the Tasks page</li>
          <li>Store backup files securely — they contain personal employee data</li>
          <li>Backups are point-in-time snapshots and do not include future changes</li>
        </ul>
      </div>
    </div>
  );
}
