"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "resend">("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("resend"); return; }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then(({ data, error }) => {
        if (error) { setMessage(error); setStatus("error"); }
        else { setMessage(data.message); setStatus("success"); }
      })
      .catch(() => { setMessage("Something went wrong. Please try again."); setStatus("error"); });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const { data, error } = await res.json();
      if (error) setMessage(error);
      else { setMessage(data.message); setResendSent(true); }
    } catch { setMessage("Something went wrong."); }
    finally { setResending(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="card p-8 w-full max-w-md text-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
            <div className="text-text-muted text-sm">Verifying your email…</div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-extrabold text-text-main mb-2">Email Verified!</h1>
            <p className="text-text-muted text-sm mb-6">{message}</p>
            <Link href="/login" className="btn-primary inline-block">Go to Login</Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-extrabold text-text-main mb-2">Verification Failed</h1>
            <p className="text-text-muted text-sm mb-6">{message}</p>
            <button onClick={() => setStatus("resend")}
              className="text-accent text-sm hover:underline">
              Request a new verification link →
            </button>
          </>
        )}

        {status === "resend" && !resendSent && (
          <>
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-xl font-extrabold text-text-main mb-2">Resend Verification</h1>
            <p className="text-text-muted text-sm mb-6">Enter your email address and we'll send you a new verification link.</p>
            <form onSubmit={handleResend} className="space-y-3 text-left">
              <input
                type="email" required value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="your@email.com"
                className="input w-full"
              />
              {message && <p className="text-danger text-xs">{message}</p>}
              <button type="submit" disabled={resending} className="btn-primary w-full">
                {resending ? "Sending…" : "Send Verification Email"}
              </button>
            </form>
            <Link href="/login" className="block mt-4 text-text-muted text-xs hover:text-text-soft">
              Back to login
            </Link>
          </>
        )}

        {status === "resend" && resendSent && (
          <>
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-xl font-extrabold text-text-main mb-2">Check Your Inbox</h1>
            <p className="text-text-muted text-sm mb-6">{message}</p>
            <Link href="/login" className="btn-primary inline-block">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
