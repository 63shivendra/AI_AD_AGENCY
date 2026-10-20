"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy review", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const el = document.createElement("textarea");
          el.value = text;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          el.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }}
      className={cn("btn", copied ? "bg-mint text-ink" : "bg-lime text-ink hover:bg-[#d6ff62]", className)}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function MarkPostedButton({ reviewId, posted }: { reviewId: string; posted: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (posted) return <span className="text-[10.5px] font-semibold text-mint">Posted to Google</span>;

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/reviews/${reviewId}/post`, { method: "POST" });
        router.refresh();
        setBusy(false);
      }}
      className="flex items-center gap-1 text-[10.5px] font-semibold text-dim hover:text-mint"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      Mark posted
    </button>
  );
}

const STATUSES = ["NEW", "CONTACTED", "WON", "LOST"];

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  return (
    <select
      value={value}
      disabled={busy}
      onChange={async (e) => {
        const next = e.target.value;
        setValue(next);
        setBusy(true);
        await fetch(`/api/leads/${leadId}/status`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        router.refresh();
        setBusy(false);
      }}
      className={cn(
        "cursor-pointer rounded-md border bg-transparent px-1.5 py-1 text-[10.5px] font-bold uppercase tracking-wider outline-none",
        value === "WON"
          ? "border-mint/30 text-mint"
          : value === "NEW"
            ? "border-violet/30 text-violet"
            : value === "CONTACTED"
              ? "border-amber/30 text-amber"
              : "border-line2 text-faint"
      )}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-panel text-chalk">
          {s}
        </option>
      ))}
    </select>
  );
}

export function PublishButton({ adId, status }: { adId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (status === "PUBLISHED") {
    return <span className="text-[10.5px] font-semibold text-mint">Live on Meta</span>;
  }

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/ads/${adId}/publish`, { method: "POST" });
        const data = (await res.json()) as { sandbox?: boolean };
        setMsg(data.sandbox ? "Sandbox publish" : "Published");
        router.refresh();
        setBusy(false);
      }}
      className="flex items-center gap-1 text-[10.5px] font-semibold text-dim hover:text-lime"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
      {msg || "Publish"}
    </button>
  );
}
