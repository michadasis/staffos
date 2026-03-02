"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

const NAV_ALL = [
  { href: "/dashboard", icon: "▣", label: "Dashboard", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/staff", icon: "👥", label: "Staff", roles: ["ADMIN", "MANAGER"] },
  { href: "/tasks", icon: "✅", label: "Tasks", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/performance", icon: "📊", label: "Performance", roles: ["ADMIN", "MANAGER"] },
  { href: "/messages", icon: "💬", label: "Messages", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/reports", icon: "📈", label: "Reports", roles: ["ADMIN", "MANAGER"] },
  { href: "/settings", icon: "⚙️", label: "Settings", roles: ["ADMIN", "MANAGER", "STAFF"] },
];

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// Desktop sidebar
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role || "STAFF";
  const nav = NAV_ALL.filter((n) => n.roles.includes(role));

  return (
    <aside className={`hidden md:flex flex-col bg-surface border-r border-border transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[230px]"} flex-shrink-0 h-screen sticky top-0`}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-base flex-shrink-0">⚡</div>
        {!collapsed && <span className="font-extrabold text-[15px] tracking-tight text-text-main whitespace-nowrap">StaffOS</span>}
        <button onClick={onToggle} className={`ml-auto text-text-muted hover:text-text-main transition-colors ${collapsed ? "hidden" : "block"}`}>◀</button>
      </div>

      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {nav.map((n) => {
          const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap
                ${active ? "bg-accent-soft text-accent border-l-2 border-accent" : "text-text-muted hover:bg-surface-alt hover:text-text-soft"}`}>
              <span className="text-base flex-shrink-0">{n.icon}</span>
              {!collapsed && <span>{n.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 pb-2">
          <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit
            ${role === "ADMIN" ? "text-purple-400 bg-purple-400/10 border-purple-400/20" :
              role === "MANAGER" ? "text-accent bg-accent/10 border-accent/20" :
              "text-text-soft bg-text-soft/10 border-text-soft/20"}`}>
            {role}
          </div>
        </div>
      )}

      <div className="border-t border-border p-3">
        {user && (
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <Avatar name={user.name} size={34} />
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-text-main truncate">{user.name}</div>
                  <div className="text-[10px] text-text-muted truncate">{user.employee?.department?.name || user.role}</div>
                </div>
                <button onClick={() => { logout(); toast.success("Signed out"); }} className="text-text-muted hover:text-danger transition-colors text-sm" title="Logout">↩</button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// Mobile drawer overlay
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role || "STAFF";
  const nav = NAV_ALL.filter((n) => n.roles.includes(role));

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className={`md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} />
      {/* Drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 bg-surface border-r border-border z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-base">⚡</div>
          <span className="font-extrabold text-[15px] tracking-tight text-text-main">StaffOS</span>
          <button onClick={onClose} className="ml-auto text-text-muted hover:text-text-main text-xl">✕</button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href} onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${active ? "bg-accent-soft text-accent border-l-2 border-accent" : "text-text-muted hover:bg-surface-alt hover:text-text-soft"}`}>
                <span className="text-lg">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit mb-3
            ${role === "ADMIN" ? "text-purple-400 bg-purple-400/10 border-purple-400/20" :
              role === "MANAGER" ? "text-accent bg-accent/10 border-accent/20" :
              "text-text-soft bg-text-soft/10 border-text-soft/20"}`}>
            {role}
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <Avatar name={user.name} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-text-main truncate">{user.name}</div>
                <div className="text-[10px] text-text-muted truncate">{user.email}</div>
              </div>
              <button onClick={() => { logout(); toast.success("Signed out"); onClose(); }}
                className="text-text-muted hover:text-danger transition-colors text-sm p-1" title="Logout">↩</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Mobile bottom nav bar (shows 4-5 most important items)
function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "STAFF";

  const mobileNav = NAV_ALL.filter((n) => n.roles.includes(role)).slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-30 flex">
      {mobileNav.map((n) => {
        const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
        return (
          <Link key={n.href} href={n.href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors
              ${active ? "text-accent" : "text-text-muted"}`}>
            <span className="text-xl leading-none">{n.icon}</span>
            <span className="text-[9px] font-semibold tracking-tight">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/notifications").then((r) => r.json()).then(({ data }) => {
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
    setUnreadCount(0);
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="w-9 h-9 bg-bg border border-border rounded-xl flex items-center justify-center text-base hover:border-accent/50 transition-colors relative">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 bg-surface border border-border rounded-2xl w-80 z-50 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold text-text-main">Notifications</span>
              {unreadCount > 0 && <button onClick={markAllRead} className="text-[11px] text-accent hover:underline">Mark all read</button>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-surface-alt rounded-lg animate-pulse" />)}</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center"><div className="text-2xl mb-2">🔔</div><div className="text-sm text-text-muted">You're all caught up!</div></div>
              ) : (
                notifications.map((n) => (
                  <button key={n.id} onClick={() => { setOpen(false); if (n.link) router.push(n.link); }}
                    className={`w-full flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-alt transition-colors text-left ${!n.read ? "bg-accent/5" : ""}`}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] leading-snug ${!n.read ? "text-text-main font-semibold" : "text-text-soft"}`}>{n.text}</div>
                      <div className="text-[10px] text-text-muted mt-1">{timeAgo(n.time)}</div>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const pageTitle = NAV_ALL.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label || "Dashboard";

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-4 md:px-6 gap-3 flex-shrink-0 sticky top-0 z-30">
      {/* Hamburger — mobile only */}
      <button onClick={onMenuClick} className="md:hidden text-text-muted hover:text-text-main text-xl w-8 flex items-center justify-center">☰</button>
      {/* Collapse toggle — desktop only */}
      <button onClick={onMenuClick} className="hidden md:flex text-text-muted hover:text-text-main text-lg">☰</button>
      <h2 className="text-[15px] font-bold text-text-main">{pageTitle}</h2>
      <div className="flex-1" />
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden md:flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 text-sm">
          <span className="text-text-muted">🔍</span>
          <input placeholder="Quick search…" className="bg-transparent outline-none text-text-main text-xs w-32 placeholder-text-muted" />
        </div>
        <NotificationBell />
        {user && <Avatar name={user.name} size={32} />}
      </div>
    </header>
  );
}

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const routeConfig = NAV_ALL.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)));

  useEffect(() => {
    if (routeConfig && user && !routeConfig.roles.includes(user.role)) {
      router.replace("/dashboard");
      toast.error("You don't have permission to view that page");
    }
  }, [user, routeConfig, router]);

  if (routeConfig && user && !routeConfig.roles.includes(user.role)) return null;
  return <>{children}</>;
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);

  const handleMenuClick = () => {
    // On mobile: toggle drawer. On desktop: toggle collapse.
    if (window.innerWidth < 768) setDrawerOpen(true);
    else setCollapsed((c) => !c);
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-lg animate-pulse">⚡</div>
        <div className="text-text-muted text-sm">Loading StaffOS…</div>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-bg pb-20 md:pb-6">
          <RoleGuard>{children}</RoleGuard>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><DashboardInner>{children}</DashboardInner></AuthProvider>;
}
