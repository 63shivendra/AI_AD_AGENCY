"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, MessageCircle } from "lucide-react";

export function LeadForm({
  clientId,
  clientName,
  offers,
  accent,
}: {
  clientId: string;
  clientName: string;
  offers: { id: string; title: string; price: string | null }[];
  accent: string;
}) {
  const [form, setForm] = useState({ name: "", phone: "", intent: offers[0]?.title ?? "General enquiry" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, ...form }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Kuch galat ho gaya. Dobara try karein.");
      setState("idle");
      return;
    }
    const { waUrl } = (await res.json()) as { waUrl: string };
    setState("done");
    setTimeout(() => {
      window.location.href = waUrl;
    }, 700);
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
        >
          <Check className="h-6 w-6" strokeWidth={3} />
        </div>
        <p className="mt-3 text-[16px] font-bold text-[#14161A]">Enquiry mil gayi!</p>
        <p className="mt-1 text-[12.5px] text-[#6B7280]">
          WhatsApp khul raha hai. {clientName} ki team turant reply karegi.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-[13px] font-bold text-[#14161A]">2 minute mein enquiry bhejein</p>
      <p className="mt-0.5 text-[11px] text-[#6B7280]">Koi advance payment nahi. Sirf details.</p>

      <div className="mt-3 space-y-2">
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Aapka naam"
          className="w-full rounded-xl border border-black/10 bg-[#F7F7F4] px-3 py-2.5 text-[13px] text-[#14161A] outline-none placeholder:text-black/30 focus:border-black/25"
        />
        <div className="flex overflow-hidden rounded-xl border border-black/10 bg-[#F7F7F4] focus-within:border-black/25">
          <span className="flex items-center border-r border-black/10 px-3 text-[13px] font-semibold text-black/45">+91</span>
          <input
            required
            inputMode="numeric"
            maxLength={10}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
            placeholder="WhatsApp number"
            className="w-full bg-transparent px-3 py-2.5 text-[13px] text-[#14161A] outline-none placeholder:text-black/30"
          />
        </div>
        <select
          value={form.intent}
          onChange={(e) => setForm({ ...form, intent: e.target.value })}
          className="w-full appearance-none rounded-xl border border-black/10 bg-[#F7F7F4] px-3 py-2.5 text-[13px] text-[#14161A] outline-none"
        >
          {offers.map((o) => (
            <option key={o.id} value={o.title}>
              {o.title}
              {o.price ? ` · ${o.price}` : ""}
            </option>
          ))}
          <option value="General enquiry">Kuch aur poochna hai</option>
        </select>
      </div>

      {error && <p className="mt-2 text-[11px] font-medium text-rose">{error}</p>}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-bold text-white transition-transform active:scale-[0.99]"
        style={{ background: accent }}
      >
        {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        {state === "sending" ? "Bhej rahe hain…" : "WhatsApp par enquiry bhejein"}
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-2 text-center text-[9.5px] text-black/35">
        Aapka number sirf {clientName} ko dikhega.
      </p>
    </form>
  );
}
