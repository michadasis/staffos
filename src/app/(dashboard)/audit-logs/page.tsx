"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

const ACTION_COLORS: Record<string, string> = {
  LOGIN:                "text-success bg-success/10 border-success/20",
  ENABLE_2FA:           "text-accent bg-accent/10 border-accent/20",
  DISABLE_2FA:          "text-warning bg-warning/10 border-warning/20",
  UPDATE_STAFF:         "text-blue-400 bg-blue-400/10 border-blue-400/20",
  DELETE_STAFF:         "text-danger bg-danger/10 border-danger/20",
  APPROVE_REGISTRATION: "text-success bg-success/10 border-success/20",
  REJECT_REGISTRATION:  "text-danger bg-danger/10 border-danger/20",
  APPROVE_EMAIL_CHANGE: "text-accent bg-accent/10 border-accent/20",
  REJECT_EMAIL_CHANGE:  "text-danger bg-danger/10 border-danger/20",
  PASSWORD_CHANGED:     "text-warning bg-warning/10 border-warning/20",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] || "text-text-muted bg-surface border-border";
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [logs, setLogs]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [search, setSearch]       = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter, setUserFilter]     = useState("");
  const [filters, setFilters]     = useState<{ actions: string[]; entities: string[]; users: any[] }>({ actions: [], entities: [], users: [] });
  const [expanded, setExpanded]   = useState<number | null>(null);

  const fetchLogs = (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (search)       params.set("search", search);
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entity", entityFilter);
    if (userFilter)   params.set("userId", userFilter);

    fetch(`/api/audit-logs?${params}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        if (data.filters) setFilters(data.filters);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(1); setPage(1); }, [search, actionFilter, entityFilter, userFilter]);
  useEffect(() => { fetchLogs(page); }, [page]);

  if (!isAdminOrManager) {
    return <div className="text-center py-20 text-text-muted">You do not have permission to view audit logs.</div>;
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-text-main">Audit Logs</h2>
          <p className="text-xs text-text-muted mt-0.5">{total} events recorded</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-sm col-span-1 md:col-span-1"
          />
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input text-sm">
            <option value="">All Actions</option>
            {filters.actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </select>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="input text-sm">
            <option value="">All Entities</option>
            {filters.entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="input text-sm">
            <option value="">All Users</option>
            {filters.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        {(search || actionFilter || entityFilter || userFilter) && (
          <button
            onClick={() => { setSearch(""); setActionFilter(""); setEntityFilter(""); setUserFilter(""); }}
            className="text-[11px] text-accent hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="card h-14 animate-pulse bg-surface-alt" />)}</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center text-text-muted text-sm">No audit logs found</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] px-5 py-3 border-b border-border">
            {["User", "Action", "Entity", "Time", "Details"].map((h) => (
              <div key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id}>
                <div
                  className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] px-5 py-3.5 items-center hover:bg-surface-alt transition-colors cursor-pointer gap-2 md:gap-0"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  {/* Mobile label row */}
                  <div className="md:hidden flex items-center justify-between">
                    <ActionBadge action={log.action} />
                    <span className="text-[10px] text-text-muted">{timeAgo(log.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent flex-shrink-0">
                      {log.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-text-main truncate">{log.user?.name || "Unknown"}</div>
                      <div className="text-[10px] text-text-muted truncate">{log.user?.email}</div>
                    </div>
                  </div>
                  <div className="hidden md:block"><ActionBadge action={log.action} /></div>
                  <div className="hidden md:block text-[12px] text-text-soft">
                    {log.entity}{log.entityId ? ` #${log.entityId}` : ""}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-[11px] text-text-muted">{timeAgo(log.createdAt)}</div>
                    <div className="text-[10px] text-text-muted/60">{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div className="hidden md:flex justify-end">
                    {(log.before || log.after || log.ip) && (
                      <span className="text-[10px] text-accent border border-accent/30 rounded-lg px-2 py-0.5 hover:bg-accent/10 transition-colors">
                        {expanded === log.id ? "Hide" : "Details"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === log.id && (log.before || log.after || log.ip) && (
                  <div className="px-5 pb-4 pt-1 bg-surface-alt border-t border-border">
                    <div className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-2">Event Details</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {log.ip && (
                        <div>
                          <div className="text-[10px] text-text-muted mb-1">IP Address</div>
                          <div className="font-mono text-[11px] text-text-soft bg-bg border border-border rounded-lg px-3 py-2">{log.ip}</div>
                        </div>
                      )}
                      {log.before && (
                        <div>
                          <div className="text-[10px] text-text-muted mb-1">Before</div>
                          <pre className="font-mono text-[10px] text-text-soft bg-bg border border-border rounded-lg px-3 py-2 overflow-x-auto max-h-32">
                            {JSON.stringify(log.before, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.after && (
                        <div>
                          <div className="text-[10px] text-text-muted mb-1">After</div>
                          <pre className="font-mono text-[10px] text-text-soft bg-bg border border-border rounded-lg px-3 py-2 overflow-x-auto max-h-32">
                            {JSON.stringify(log.after, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-muted">Page {page} of {pages} · {total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-accent/40 disabled:opacity-40 transition-colors">
              Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-accent/40 disabled:opacity-40 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
