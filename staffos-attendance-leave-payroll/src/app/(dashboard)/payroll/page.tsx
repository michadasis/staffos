"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ payrollProvider: "", payrollCurrency: "USD", payrollPayDay: "25" });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/system-settings")
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          setSettings(data);
          setEnabled(data.payrollEnabled === "true");
          setForm({
            payrollProvider: data.payrollProvider || "",
            payrollCurrency: data.payrollCurrency || "USD",
            payrollPayDay: data.payrollPayDay || "25",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, payrollEnabled: String(enabled) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Payroll settings saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 text-center text-text-muted text-sm">Loading…</div>;

  if (!enabled && !isAdmin) {
    return (
      <div className="w-full flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="text-center">
          <div className="text-5xl mb-4">💳</div>
          <h2 className="text-xl font-extrabold text-text-main mb-2">Payroll Not Enabled</h2>
          <p className="text-text-muted text-sm">Payroll integration has not been enabled by your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-main">Payroll</h1>
          <p className="text-text-muted text-sm mt-0.5">Payroll integration and configuration</p>
        </div>
        {enabled && (
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20">Active</span>
        )}
      </div>

      {/* Admin config card */}
      {isAdmin && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-text-main">Payroll Integration</h3>
              <p className="text-[11px] text-text-muted mt-0.5">Enable or disable payroll features for all users</p>
            </div>
            <button onClick={() => setEnabled(v => !v)}
              className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors ${enabled ? "bg-accent" : "bg-border"}`}>
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          {enabled && (
            <>
              <div className="h-px bg-border" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Payroll Provider</label>
                  <input value={form.payrollProvider} onChange={e => setForm(f => ({ ...f, payrollProvider: e.target.value }))}
                    placeholder="e.g. ADP, Gusto, Xero…" className="input w-full" />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select value={form.payrollCurrency} onChange={e => setForm(f => ({ ...f, payrollCurrency: e.target.value }))} className="input w-full">
                    {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "INR", "SGD", "AED"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Pay Day (day of month)</label>
                  <input type="number" min="1" max="31" value={form.payrollPayDay}
                    onChange={e => setForm(f => ({ ...f, payrollPayDay: e.target.value }))} className="input w-full" />
                </div>
              </div>
            </>
          )}

          <button onClick={saveSettings} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      )}

      {/* Payroll overview — shown when enabled */}
      {enabled && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="text-[11px] font-bold text-text-muted uppercase mb-2">Provider</div>
              <div className="text-[18px] font-extrabold text-text-main">{settings.payrollProvider || "Not configured"}</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] font-bold text-text-muted uppercase mb-2">Currency</div>
              <div className="text-[18px] font-extrabold text-text-main">{settings.payrollCurrency || "USD"}</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] font-bold text-text-muted uppercase mb-2">Next Pay Day</div>
              <div className="text-[18px] font-extrabold text-text-main">
                {(() => {
                  const day = parseInt(settings.payrollPayDay || "25");
                  const now = new Date();
                  const candidate = new Date(now.getFullYear(), now.getMonth(), day);
                  if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
                  return candidate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
                })()}
              </div>
            </div>
          </div>

          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-[16px] font-bold text-text-main mb-2">Connect Your Payroll Provider</h3>
            <p className="text-text-muted text-sm max-w-md mx-auto mb-5">
              To process payroll, connect StaffOS to your payroll provider ({settings.payrollProvider || "not set"}).
              Attendance and leave data will sync automatically.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <div className="text-[12px] font-semibold px-4 py-2 rounded-xl bg-surface-alt text-text-soft border border-border">Attendance sync</div>
              <div className="text-[12px] font-semibold px-4 py-2 rounded-xl bg-surface-alt text-text-soft border border-border">Leave deductions</div>
              <div className="text-[12px] font-semibold px-4 py-2 rounded-xl bg-surface-alt text-text-soft border border-border">Pay slips</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
