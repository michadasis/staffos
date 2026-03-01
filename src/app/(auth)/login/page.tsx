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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-lg">⚡</div>
        <span className="text-2xl font-extrabold tracking-tight text-text-main">StaffOS</span>
      </div>

      <div className="card p-8">
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
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
            ) : "Sign In"}
          </button>
        </form>


      </div>

      
    </div>
  );
}
