"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Film, TriangleAlert } from "lucide-react";

export function DemoControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<"reset" | "warmup" | null>(null);
  const [msg, setMsg] = useState("");

  async function run(action: "reset" | "warmup") {
    if (action === "reset" && !confirm("Reset all demo data back to the seeded Kanpur workspace?")) return;
    setBusy(action);
    setMsg("");
    const res = await fetch("/api/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json().catch(() => ({}))) as { queued?: number; output?: string[] };
    setBusy(null);
    if (action === "reset") {
      setMsg(
        `Demo data restored. Rendering ${data.queued ?? 0} reels in the background — refresh in about a minute.`
      );
      router.refresh();
    } else {
      setMsg(`${data.queued ?? 0} reels queued. MP4s appear within ~60 seconds — refresh the client pages.`);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => run("reset")} disabled={!!busy} className="btn-ghost h-8 px-3 text-[11.5px]">
          {busy === "reset" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Reset demo data
        </button>
        <button onClick={() => run("warmup")} disabled={!!busy} className="btn-ghost h-8 px-3 text-[11.5px]">
          {busy === "warmup" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
          Pre-render reels
        </button>
      </div>
      {msg && <p className="text-[11px] text-mint">{msg}</p>}
      <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
        <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
        Reset wipes clients, leads and media, then re-seeds the demo workspace and re-renders
        the reels. Don&apos;t run it after you&apos;ve added a real client.
      </p>
    </div>
  );
}
