"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "STAFF" });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-lg">⚡</div>
        <span className="text-2xl font-extrabold tracking-tight text-text-main">StaffOS</span>
      </div>

      <div className="card p-8">
        <h1 className="text-xl font-bold text-text-main mb-1">Create your account</h1>
        <p className="text-sm text-text-muted mb-8">Join your team on StaffOS</p>

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
            <label className="label">Role</label>
            <select value={form.role} onChange={set("role")}
              className="input">
              <option value="STAFF">Staff / Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
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
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
            ) : "Create Account"}
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
