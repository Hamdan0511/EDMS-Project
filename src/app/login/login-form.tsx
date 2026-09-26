"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const fieldClass =
  "w-full border border-border-strong bg-white px-4 py-3 text-[14px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand-500";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign in failed. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="border border-danger/30 bg-red-50 px-4 py-3 text-[13px] text-danger" role="alert">
          {error}
        </div>
      )}
      <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
        Email
        <input
          type="email"
          required
          autoFocus
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          placeholder="you@shanfarifurnishing.com"
        />
      </label>
      <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
          placeholder="••••••••"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 bg-brand-900 px-6 py-3.5 text-[13px] font-medium tracking-wide text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign In →"}
      </button>
    </form>
  );
}
