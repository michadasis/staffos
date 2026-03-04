"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setMessage("Missing confirmation token."); setStatus("error"); return; }
    fetch(`/api/auth/confirm-email-change?token=${token}`)
      .then((r) => r.json())
      .then(({ data, error }) => {
        if (error) { setMessage(error); setStatus("error"); }
        else { setMessage(data.message); setStatus("success"); }
      })
      .catch(() => { setMessage("Something went wrong. Please try again."); setStatus("error"); });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="card p-8 w-full max-w-md text-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
            <div className="text-text-muted text-sm">Confirming your new email…</div>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-extrabold text-text-main mb-2">Email Updated!</h1>
            <p className="text-text-muted text-sm mb-6">{message}</p>
            <Link href="/login" className="btn-primary inline-block">Go to Login</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-extrabold text-text-main mb-2">Confirmation Failed</h1>
            <p className="text-text-muted text-sm mb-6">{message}</p>
            <Link href="/login" className="btn-ghost inline-block">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
