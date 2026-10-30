"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type State = "idle" | "running" | "done" | "error";

/**
 * Starts the AI UGC pipeline for a client: 2 stills + 5 image-to-video clips on
 * Higgsfield, then a local edit. Generation is paid and takes a few minutes;
 * the result lands in the client's Ads tab.
 */
export function UgcButton({
  slug,
  live,
  compact,
}: {
  slug: string;
  live: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");

  async function start() {
    if (!live) return;
    const ok = window.confirm(
      "Generate an AI UGC ad?\n\nThis runs 2 stills + 5 image-to-video clips and takes a few minutes (longer on a local GPU). The clips are cached, so re-renders are free.\n\nContinue?"
    );
    if (!ok) return;

    setState("running");
    setProgress(2);
    setNote("");

    try {
      const res = await fetch(`/api/clients/${slug}/ugc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        jobId?: string;
        error?: string;
      };
      if (!res.ok || !data.jobId) {
        setState("error");
        setNote(data.error ?? "Could not start generation");
        return;
      }

      for (let i = 0; i < 400; i++) {
        await sleep(3000);
        const poll = await fetch(`/api/jobs/${data.jobId}`);
        if (!poll.ok) continue;
        const job = (await poll.json()) as {
          status: string;
          progress: number;
          error?: string | null;
        };
        setProgress(job.progress);
        if (job.status === "DONE") {
          setState("done");
          setNote("UGC ad rendered");
          router.refresh();
          return;
        }
        if (job.status === "FAILED") {
          setState("error");
          setNote(job.error ?? "Generation failed");
          return;
        }
      }
      setState("error");
      setNote("Timed out — check the job in Settings");
    } catch {
      setState("error");
      setNote("Network error");
    }
  }

  const running = state === "running";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={start}
        disabled={!live || running}
        title={live ? "Generate a 5-beat AI UGC ad" : "Configure an AI backend in Settings"}
        className={cn(
          compact ? "btn-ghost h-8 px-2.5 text-[11.5px]" : "btn-ghost h-9 px-3 text-[12px]",
          "border-violet/40 text-violet hover:border-violet hover:bg-violet/10",
          !live && "cursor-not-allowed opacity-50"
        )}
      >
        {running ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Wand2 className="h-3 w-3" />
        )}
        {running ? `Generating ${progress}%` : "AI UGC ad"}
      </button>
      {!live && (
        <span className="text-[9.5px] text-faint">needs AI backend</span>
      )}
      {note && (
        <span
          className={cn(
            "max-w-[240px] text-right text-[9.5px] leading-snug",
            state === "error" ? "text-rose" : "text-mint"
          )}
        >
          {note}
        </span>
      )}
    </div>
  );
}
