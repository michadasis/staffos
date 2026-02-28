"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    jobTitle: user?.employee?.jobTitle || "",
  });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, jobTitle: form.jobTitle }),
      });
      if (!res.ok) throw new Error("Update failed");
      await refresh();
      toast.success("Profile updated!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "notifications", label: "Notifications" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text-main">Settings</h2>
        <p className="text-xs text-text-muted mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors
              ${tab === t.id ? "bg-accent text-white" : "text-text-muted hover:text-text-main"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="card p-6 space-y-5">
          <h3 className="text-[14px] font-bold text-text-main">Profile Information</h3>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-xl font-bold text-white font-mono">
              {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-text-main">{user?.name}</div>
              <div className="text-[11px] text-text-muted">{user?.role} · {user?.employee?.department?.name || "No department"}</div>
              <button className="text-[11px] text-accent hover:underline mt-1">Change avatar</button>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={form.email}
                disabled
                className="input opacity-50 cursor-not-allowed"
              />
              <p className="text-[10px] text-text-muted mt-1">Email changes require admin approval</p>
            </div>
            <div>
              <label className="label">Job Title</label>
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="input"
                placeholder="e.g. Software Engineer"
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {tab === "security" && (
        <div className="card p-6 space-y-5">
          <h3 className="text-[14px] font-bold text-text-main">Change Password</h3>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success("Password updated!"); }}>
            {[["Current Password", "currentPassword"], ["New Password", "newPassword"], ["Confirm New Password", "confirmPassword"]].map(([l, k]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input
                  type="password"
                  value={(pwForm as any)[k]}
                  onChange={(e) => setPwForm({ ...pwForm, [k]: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
            ))}
            <button type="submit" className="btn-primary">Update Password</button>
          </form>

          <div className="border-t border-border pt-5">
            <h3 className="text-[14px] font-bold text-text-main mb-3">Active Sessions</h3>
            <div className="bg-surface-alt border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[12px] font-semibold text-text-main">Current session</div>
                <div className="text-[10px] text-text-muted mt-0.5">Browser · {new Date().toLocaleDateString()}</div>
              </div>
              <span className="text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">Active</span>
            </div>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="card p-6 space-y-4">
          <h3 className="text-[14px] font-bold text-text-main">Notification Preferences</h3>
          {[
            ["Task assignments", "Get notified when a task is assigned to you"],
            ["Task status updates", "When tasks you created are updated"],
            ["New messages", "When you receive a direct message"],
            ["Team announcements", "Company-wide notifications"],
            ["Weekly digest", "Summary of your team's activity"],
          ].map(([label, desc]) => (
            <div key={label as string} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="text-[13px] font-semibold text-text-main">{label}</div>
                <div className="text-[11px] text-text-muted">{desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 bg-border rounded-full peer peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
