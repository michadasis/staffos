"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", jobTitle: user?.employee?.jobTitle || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState((user as any)?.twoFactorEnabled || false);
  const [tfaStep, setTfaStep] = useState<"idle" | "setup" | "disable">("idle");
  const [tfaQrCode, setTfaQrCode] = useState("");
  const [tfaSecret, setTfaSecret] = useState("");
  const [tfaCode, setTfaCode] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);

  const startTfaSetup = async () => {
    setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTfaQrCode(json.data.qrCode);
      setTfaSecret(json.data.secret);
      setTfaStep("setup");
    } catch (err: any) { toast.error(err.message); }
    finally { setTfaLoading(false); }
  };

  const confirmTfaEnable = async () => {
    if (tfaCode.length !== 6) return toast.error("Enter the 6-digit code");
    setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: tfaCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("2FA enabled!");
      setTwoFactorEnabled(true);
      setTfaStep("idle");
      setTfaCode("");
    } catch (err: any) { toast.error(err.message); }
    finally { setTfaLoading(false); }
  };

  const confirmTfaDisable = async () => {
    if (tfaCode.length !== 6) return toast.error("Enter your current 2FA code to confirm");
    setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: tfaCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("2FA disabled");
      setTwoFactorEnabled(false);
      setTfaStep("idle");
      setTfaCode("");
    } catch (err: any) { toast.error(err.message); }
    finally { setTfaLoading(false); }
  };
  const [showConfirm, setShowConfirm] = useState(false);

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

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Password changed successfully!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) { toast.error(err.message); }
    finally { setChangingPw(false); }
  };

  const tabs = [{ id: "profile", label: "Profile" }, { id: "security", label: "Security" }, { id: "notifications", label: "Notifications" }];

  const pwStrength = (pw: string) => {
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#10b981"];
    return { score, label: labels[score], color: colors[score] };
  };

  const strength = pwStrength(pwForm.newPassword);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text-main">Settings</h2>
        <p className="text-xs text-text-muted mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${tab === t.id ? "bg-accent text-white" : "text-text-muted hover:text-text-main"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="card p-6 space-y-5">
          <h3 className="text-[14px] font-bold text-text-main">Profile Information</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-xl font-bold text-white font-mono">
              {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-text-main">{user?.name}</div>
              <div className="text-[11px] text-text-muted">{user?.role} · {user?.employee?.department?.name || "No department"}</div>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" value={form.email} disabled className="input opacity-50 cursor-not-allowed" />
              <p className="text-[10px] text-text-muted mt-1">Email changes require admin approval</p>
            </div>
            <div>
              <label className="label">Job Title</label>
              <input type="text" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} className="input" placeholder="e.g. Software Engineer" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save Changes"}</button>
          </form>
        </div>
      )}

      {tab === "security" && (
        <div className="card p-6 space-y-5">
          <h3 className="text-[14px] font-bold text-text-main">Change Password</h3>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="input pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main text-sm">
                  {showCurrent ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="input pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main text-sm">
                  {showNew ? "🙈" : "👁"}
                </button>
              </div>
              {pwForm.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ background: i <= strength.score ? strength.color : "#1e2d45" }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="input pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main text-sm">
                  {showConfirm ? "🙈" : "👁"}
                </button>
              </div>
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-[11px] text-danger mt-1">Passwords don't match</p>
              )}
            </div>
            <button type="submit" disabled={changingPw || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {changingPw ? "Updating…" : "Update Password"}
            </button>
          </form>

          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-text-main">Two-Factor Authentication</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Add an extra layer of security to your account</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${twoFactorEnabled ? "text-success bg-success/10 border-success/20" : "text-text-muted bg-surface border-border"}`}>
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {tfaStep === "idle" && (
              <button
                onClick={() => twoFactorEnabled ? setTfaStep("disable") : startTfaSetup()}
                disabled={tfaLoading}
                className={`text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-50 ${twoFactorEnabled ? "text-danger border-danger/30 bg-danger/5 hover:bg-danger/10" : "btn-primary"}`}>
                {tfaLoading ? "Loading…" : twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
              </button>
            )}

            {tfaStep === "setup" && (
              <div className="bg-surface-alt border border-border rounded-2xl p-5 space-y-4">
                <div className="text-[12px] text-text-muted leading-relaxed">
                  Scan this QR code with <span className="text-text-main font-semibold">Google Authenticator</span>, <span className="text-text-main font-semibold">Authy</span>, or any TOTP app.
                </div>
                {tfaQrCode && (
                  <div className="flex justify-center">
                    <img src={tfaQrCode} alt="2FA QR Code" className="w-44 h-44 rounded-xl border-4 border-white" />
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-text-muted mb-1">Or enter this code manually:</div>
                  <div className="font-mono text-[12px] text-text-main bg-bg border border-border rounded-lg px-3 py-2 tracking-widest break-all">{tfaSecret}</div>
                </div>
                <div>
                  <label className="label">Enter the 6-digit code to confirm</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="input text-center text-xl tracking-[0.4em] font-mono"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2.5">
                  <button onClick={confirmTfaEnable} disabled={tfaLoading || tfaCode.length !== 6} className="btn-primary flex-1 disabled:opacity-50">
                    {tfaLoading ? "Verifying…" : "Confirm & Enable"}
                  </button>
                  <button onClick={() => { setTfaStep("idle"); setTfaCode(""); }} className="btn-ghost flex-1">Cancel</button>
                </div>
              </div>
            )}

            {tfaStep === "disable" && (
              <div className="bg-danger/5 border border-danger/20 rounded-2xl p-5 space-y-4">
                <p className="text-[12px] text-text-muted">Enter your current authenticator code to confirm disabling 2FA.</p>
                <div>
                  <label className="label">Authentication Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="input text-center text-xl tracking-[0.4em] font-mono"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2.5">
                  <button onClick={confirmTfaDisable} disabled={tfaLoading || tfaCode.length !== 6} className="flex-1 py-2.5 rounded-xl bg-danger text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50">
                    {tfaLoading ? "Disabling…" : "Disable 2FA"}
                  </button>
                  <button onClick={() => { setTfaStep("idle"); setTfaCode(""); }} className="btn-ghost flex-1">Cancel</button>
                </div>
              </div>
            )}
          </div>

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
