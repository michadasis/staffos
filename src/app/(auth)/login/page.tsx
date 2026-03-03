"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      if (json.data?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoading(false);
        return;
      }

      await login(email, password, twoFactorCode || undefined);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return toast.error("Please enter your 2FA code");
    setLoading(true);
    try {
      await login(email, password, twoFactorCode);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <img src="/logo.png" alt="StaffOS" className="w-10 h-10 rounded-xl object-cover" />
        <span className="text-2xl font-extrabold tracking-tight text-text-main">StaffOS</span>
      </div>

      <div className="card p-8">
        {requiresTwoFactor ? (
          <>
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">🔐</div>
              <h1 className="text-xl font-bold text-text-main mb-1">Two-Factor Authentication</h1>
              <p className="text-sm text-text-muted">Enter the 6-digit code from your authenticator app</p>
            </div>
            <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
              <div>
                <label className="label">Authentication Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || twoFactorCode.length !== 6} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : "Verify"}
              </button>
              <button type="button" onClick={() => { setRequiresTwoFactor(false); setTwoFactorCode(""); }} className="w-full text-sm text-text-muted hover:text-text-soft transition-colors">
                ← Back to login
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-text-main mb-1">Sign in to your account</h1>
            <p className="text-sm text-text-muted mb-8">Enter your credentials to access the dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className="input" autoComplete="email" required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" className="input pr-10" autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-soft text-sm">
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</> : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-text-muted text-center mb-3">Demo credentials</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Admin", email: "admin@staffos.com", pass: "Admin@123" },
                  { label: "Staff", email: "a.chen@staffos.com", pass: "Staff@123" },
                ].map((c) => (
                  <button key={c.label} type="button"
                    onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                    className="text-xs bg-surface-alt border border-border rounded-lg px-3 py-2 text-text-soft hover:text-accent hover:border-accent/50 transition-colors text-left">
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-text-muted truncate">{c.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {!requiresTwoFactor && (
        <p className="text-center text-sm text-text-muted mt-6">
          Need an account?{" "}
          <Link href="/register" className="text-accent hover:underline font-medium">Register here</Link>
        </p>
      )}
    </div>
  );
}
