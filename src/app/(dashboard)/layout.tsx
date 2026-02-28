"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard", icon: "▣", label: "Dashboard" },
  { href: "/staff", icon: "👥", label: "Staff" },
  { href: "/tasks", icon: "✅", label: "Tasks" },
  { href: "/performance", icon: "📊", label: "Performance" },
  { href: "/messages", icon: "💬", label: "Messages" },
  { href: "/reports", icon: "📈", label: "Reports" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0, fontFamily: "var(--font-dm-mono)" }}>
      {initials}
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className={`flex flex-col bg-surface border-r border-border transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[230px]"} flex-shrink-0 h-screen sticky top-0`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-base flex-shrink-0">⚡</div>
        {!collapsed && <span className="font-extrabold text-[15px] tracking-tight text-text-main whitespace-nowrap">StaffOS</span>}
        <button onClick={onToggle} className={`ml-auto text-text-muted hover:text-text-main transition-colors ${collapsed ? "hidden" : "block"}`}>
          ◀
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap
                ${active ? "bg-accent-soft text-accent border-l-2 border-accent ml-0" : "text-text-muted hover:bg-surface-alt hover:text-text-soft"}`}>
              <span className="text-base flex-shrink-0">{n.icon}</span>
              {!collapsed && <span>{n.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        {user && (
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <Avatar name={user.name} size={34} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-text-main truncate">{user.name}</div>
                <div className="text-[10px] text-text-muted truncate">{user.role}</div>
              </div>
            )}
            {!collapsed && (
              <button onClick={() => { logout(); toast.success("Signed out"); }}
                className="text-text-muted hover:text-danger transition-colors text-sm" title="Logout">↩</button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const pageTitle = NAV.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label || "Dashboard";

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-6 gap-4 flex-shrink-0 sticky top-0 z-30">
      <button onClick={onMenuClick} className="text-text-muted hover:text-text-main text-lg">☰</button>
      <h2 className="text-[15px] font-bold text-text-main">{pageTitle}</h2>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 text-sm">
          <span className="text-text-muted">🔍</span>
          <input placeholder="Quick search…" className="bg-transparent outline-none text-text-main text-xs w-32 placeholder-text-muted" />
        </div>
        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)}
            className="w-9 h-9 bg-bg border border-border rounded-xl flex items-center justify-center text-base hover:border-accent/50 transition-colors relative">
            🔔
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[9px] font-bold text-white flex items-center justify-center">2</span>
          </button>
          {notifOpen && (
            <div onClick={() => setNotifOpen(false)} className="absolute right-0 top-12 bg-surface border border-border rounded-2xl p-4 w-72 z-50 shadow-xl">
              <div className="text-sm font-bold text-text-main mb-3">Notifications</div>
              {[
                { icon: "💬", text: "Alexandra Chen sent you a message", time: "10m ago" },
                { icon: "✅", text: "Task 'Budget Reconciliation' updated", time: "1h ago" },
              ].map((n, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-border last:border-0">
                  <span>{n.icon}</span>
                  <div>
                    <div className="text-xs text-text-soft">{n.text}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {user && <Avatar name={user.name} size={34} />}
      </div>
    </header>
  );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-lg animate-pulse">⚡</div>
          <div className="text-text-muted text-sm">Loading StaffOS…</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-y-auto p-6 bg-bg">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardInner>{children}</DashboardInner>
    </AuthProvider>
  );
}
