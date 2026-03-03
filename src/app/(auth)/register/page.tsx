"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error("Passwords do not match");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <img src="/logo.png" alt="StaffOS" className="w-10 h-10 rounded-xl object-cover" />
          <span className="text-2xl font-extrabold tracking-tight text-text-main">StaffOS</span>
        </div>
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-5 text-3xl">
            ✓
          </div>
          <h1 className="text-xl font-bold text-text-main mb-2">Request Submitted</h1>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            Your registration has been submitted. An admin will review your account and approve it shortly. You will be able to log in once approved.
          </p>
          <Link href="/login" className="btn-primary inline-block px-6 py-2.5 text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <img src="/logo.png" alt="StaffOS" className="w-10 h-10 rounded-xl object-cover" />
        <span className="text-2xl font-extrabold tracking-tight text-text-main">StaffOS</span>
      </div>

      <div className="card p-8">
        <h1 className="text-xl font-bold text-text-main mb-1">Create your account</h1>
        <p className="text-sm text-text-muted mb-8">Your request will be reviewed by an admin before you can log in.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" value={form.name} onChange={set("name")} placeholder="John Smith" className="input" required />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" className="input" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={form.password} onChange={set("password")} placeholder="Min. 8 characters" className="input" required />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat password" className="input" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
            ) : "Request Access"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-text-muted mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
