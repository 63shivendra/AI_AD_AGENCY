"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const MESSAGES = [
  "Aapke words padh rahe hain…",
  "Local tone set kar rahe hain…",
  "Google-friendly review likh rahe hain…",
];

export function ReviewFlow({
  clientId,
  clientName,
  area,
  accent,
  googleReviewUrl,
  tagOptions,
}: {
  clientId: string;
  clientName: string;
  area: string;
  accent: string;
  googleReviewUrl: string | null;
  tagOptions: string[];
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [msg, setMsg] = useState(0);
  const [text, setText] = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggle = (t: string) =>
    setTags((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : curr.length >= 3 ? curr : [...curr, t]));

  async function generate() {
    setStep(2);
    setMsg(0);
    const int = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 900);
    try {
      const [res] = await Promise.all([
        fetch("/api/reviews/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId, customer: name, tags }),
        }),
        new Promise((r) => setTimeout(r, 1700)),
      ]);
      const data = (await res.json()) as { id?: string; text?: string };
      setText(data.text ?? "");
      setReviewId(data.id ?? null);
      setStep(3);
    } catch {
      setStep(3);
      setText(`Bahut accha experience raha. Staff ne poora time diya aur kaam time pe hua. ${area} mein recommend karunga.`);
    } finally {
      clearInterval(int);
    }
  }

  async function copy() {
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
    if (reviewId) {
      fetch(`/api/reviews/${reviewId}/post`, { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.15)]">
      {/* progress */}
      <div className="mb-4 flex items-center gap-1.5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: step >= s ? accent : "#E8E8E3" }}
          />
        ))}
        <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-black/35">
          {step === 1 ? "Step 1 of 3" : step === 2 ? "Writing" : step === 4 ? "Done" : "Step 3 of 3"}
        </span>
      </div>

      {step === 1 && (
        <div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-4 w-4 fill-[#F5B301] text-[#F5B301]" />
            ))}
          </div>
          <h2 className="mt-2 text-[18px] font-extrabold leading-tight tracking-tight">
            Aapko kya accha laga?
          </h2>
          <p className="mt-1 text-[11.5px] text-black/50">
            Sirf 2–3 cheezein chunein. AI aapke liye review likh dega — 10 second mein.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {tagOptions.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all active:scale-95",
                    active ? "border-transparent text-[#14161A]" : "border-black/10 bg-[#F7F7F4] text-black/60"
                  )}
                  style={active ? { background: accent } : undefined}
                >
                  {active && <Check className="mr-1 inline h-3 w-3" strokeWidth={3} />}
                  {t}
                </button>
              );
            })}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aapka naam (optional)"
            className="mt-3 w-full rounded-xl border border-black/10 bg-[#F7F7F4] px-3 py-2.5 text-[12.5px] text-[#14161A] outline-none placeholder:text-black/30 focus:border-black/25"
          />

          <button
            onClick={generate}
            disabled={tags.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-[#14161A] transition-all disabled:opacity-40"
            style={{ background: accent }}
          >
            <Sparkles className="h-4 w-4" />
            Review likho
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <p className="mt-2 text-center text-[9px] text-black/30">
            {tags.length}/3 selected · aap edit kar sakte hain
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-black/10" style={{ borderTopColor: accent }} />
            <Sparkles className="absolute inset-0 m-auto h-4 w-4 text-black/30" />
          </div>
          <p className="mt-4 text-[13px] font-bold">{MESSAGES[msg]}</p>
          <p className="mt-1 text-[10.5px] text-black/40">
            {tags.slice(0, 2).join(" · ")} — {clientName}
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="rise">
          <p className="text-[10px] font-bold uppercase tracking-wider text-black/35">Aapka review</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-[#F7F7F4] p-3 text-[12.5px] leading-relaxed text-[#14161A] outline-none focus:border-black/25"
          />
          <div className="mt-1 flex items-center justify-between text-[9.5px] text-black/35">
            <span>{text.length} characters · edit kar sakte hain</span>
            <span className="flex items-center gap-1 text-mint">
              <Check className="h-2.5 w-2.5" /> ready
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={copy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-[12.5px] font-bold text-[#14161A]"
            >
              {copied ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copy ho gaya!" : "1. Review copy karein"}
            </button>
            <a
              href={googleReviewUrl ?? "#"}
              target="_blank"
              onClick={() => setStep(4)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-bold text-white"
              style={{ background: "#14161A" }}
            >
              2. Google par paste karo
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="mt-2 text-center text-[9px] leading-relaxed text-black/35">
            Google khulega → <b>paste</b> dabayein → <b>Post</b>. Bas 3 tap.
          </p>
        </div>
      )}

      {step === 4 && (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: accent }}>
            <Check className="h-7 w-7 text-[#14161A]" strokeWidth={3} />
          </div>
          <h2 className="mt-3 text-[18px] font-extrabold tracking-tight">Shukriya!</h2>
          <p className="mx-auto mt-1.5 max-w-[240px] text-[11.5px] leading-relaxed text-black/50">
            Aapke review se {area} ke aur logon ko sahi business milne mein madad hogi.
          </p>
          <button
            onClick={() => {
              setStep(1);
              setTags([]);
              setText("");
              setCopied(false);
            }}
            className="mt-4 text-[11px] font-semibold text-black/40 underline"
          >
            Ek aur review likhein
          </button>
        </div>
      )}
    </div>
  );
}
