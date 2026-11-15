"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LogIn } from "lucide-react";
import Monogram from "../Monogram";

export default function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(configured ? "" : "Admin login isn’t set up yet. Add ADMIN_EMAILS and ADMIN_SESSION_SECRET to .env.local.");
  const [busy, setBusy] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not sign in."); return; }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Monogram className="w-24" />
        <h1 className="mt-4 text-center font-script text-5xl text-cocoa">Welcome back</h1>
        <p className="mt-1 text-center text-mute">Sign in to see the guest list and seating.</p>
        <form onSubmit={submit} className="frame mt-8 space-y-6 rounded-sm border border-line bg-card p-7">
          <div>
            <label htmlFor="u" className="block text-sm text-mute">Email</label>
            <input id="u" type="email" inputMode="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="p" className="block text-sm text-mute">Password</label>
            <input id="p" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="flex items-start gap-1.5 text-sm text-[#b4483a]"><CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />{error}</p>}
          <button type="submit" disabled={busy || !configured} className="btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-cocoa py-3.5 text-[0.95rem] tracking-wide text-[color:var(--btn-text)] disabled:opacity-60">
            <LogIn size={17} strokeWidth={1.5} />{busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
