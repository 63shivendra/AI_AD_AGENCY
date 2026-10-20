"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export function LoginForm({ hint }: { hint?: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (!res.ok) {
      setError("That passcode didn't work. Try again.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="label block">Agency passcode</label>
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="••••••••"
        autoFocus
        className="input h-11"
      />
      {error && <p className="text-[12px] font-medium text-rose">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary h-11 w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? "Opening workspace" : "Enter workspace"}
      </button>
      {hint && (
        <p className="pt-1 text-center text-[11px] text-faint">
          Demo build · passcode <span className="font-mono text-dim">{hint}</span>
        </p>
      )}
    </form>
  );
}
