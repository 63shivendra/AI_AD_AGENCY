"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "auto" | "owner" | "avatar" | "stock";

type Availability = { owner: boolean; avatar: boolean; stock: boolean };

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "auto", label: "Auto — best available" },
  { value: "owner", label: "Owner clip — real person" },
  { value: "avatar", label: "AI avatar — HeyGen lip-sync" },
  { value: "stock", label: "Stock narrator — offline" },
];

function available(mode: Mode, a: Availability) {
  if (mode === "owner") return a.owner;
  if (mode === "avatar") return a.avatar;
  return true;
}

function labelFor(mode: Mode, a: Availability) {
  const base = OPTIONS.find((o) => o.value === mode)?.label ?? mode;
  if (mode === "owner" && !a.owner) return `${base} (no clip)`;
  if (mode === "avatar" && !a.avatar) return `${base} (needs key)`;
  return base;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Per-reel presenter switch. All three paths (owner / avatar / stock) plus
 * auto are always listed; unavailable ones are disabled with a reason. Picking
 * one saves it on the ad and re-renders the reel.
 */
export function PresenterPicker({
  adId,
  mode,
  resolved,
  availability,
}: {
  adId: string;
  mode: string;
  resolved: string;
  availability: Availability;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Mode>((mode as Mode) || "auto");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");

  async function apply(next: Mode) {
    const previous = value;
    setValue(next);
    setNote("");
    setProgress(6);
    setStatus("running");
    try {
      const res = await fetch(`/api/ads/${adId}/presenter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus("failed");
        setNote(data.error ?? "Could not switch presenter");
        setValue(previous);
        return;
      }
      const { jobId } = (await res.json()) as { jobId: string };
      for (let i = 0; i < 100; i++) {
        await sleep(900);
        const poll = await fetch(`/api/jobs/${jobId}`);
        if (!poll.ok) break;
        const job = (await poll.json()) as {
          status: string;
          progress: number;
          error?: string | null;
          result?: { presenterKind?: string } | null;
        };
        setProgress(job.progress);
        if (job.status === "DONE") {
          setStatus("done");
          setNote(`Rendered with ${job.result?.presenterKind ?? next} presenter`);
          router.refresh();
          return;
        }
        if (job.status === "FAILED") {
          setStatus("failed");
          setNote(job.error ?? "Render failed");
          return;
        }
      }
      setStatus("failed");
      setNote("Render timed out");
    } catch {
      setStatus("failed");
      setNote("Network error");
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-line bg-panel2/50 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-faint">
          <UserRound className="h-3 w-3" /> Presenter
        </span>
        <span className="truncate text-[9.5px] text-faint">
          {status === "running" ? `rendering ${progress}%` : `now: ${resolved}`}
        </span>
      </div>
      <select
        value={value}
        disabled={status === "running"}
        onChange={(e) => apply(e.target.value as Mode)}
        className="mt-1 w-full rounded-md border border-line bg-ink px-2 py-1 text-[11px] text-chalk outline-none transition-colors focus:border-lime/60 disabled:opacity-60"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value} disabled={!available(o.value, availability)}>
            {labelFor(o.value, availability)}
          </option>
        ))}
      </select>
      {status === "running" ? (
        <p className="mt-1 flex items-center gap-1 text-[9.5px] text-dim">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Re-rendering the reel (~40s)…
        </p>
      ) : (
        note && (
          <p className={cn("mt-1 text-[9.5px]", status === "failed" ? "text-rose" : "text-mint")}>
            {note}
          </p>
        )
      )}
    </div>
  );
}
