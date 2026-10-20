"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X } from "lucide-react";

const NICHES = [
  "Dental Clinic",
  "Bridal Boutique",
  "NEET / JEE Coaching",
  "Jewellery",
  "Banquet Hall",
  "Leather Manufacturer (B2B)",
  "CNC / Industrial (B2B)",
  "IVF / Fertility",
  "Restaurant / Cafe",
  "Real Estate",
];

export function AddClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    niche: NICHES[0],
    area: "",
    phone: "",
    monthlyFee: 9999,
    offerTitle: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({
      ...f,
      [k]: k === "monthlyFee" ? Number(e.target.value) : e.target.value,
    }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not create the client");
      setSaving(false);
      return;
    }
    setSaving(false);
    setOpen(false);
    setForm({ name: "", contactName: "", niche: NICHES[0], area: "", phone: "", monthlyFee: 9999, offerTitle: "" });
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary h-9 px-3 text-[12.5px]">
        <Plus className="h-3.5 w-3.5" />
        Add client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5 shadow-2xl rise">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="label">Onboard</p>
                <h3 className="mt-1 text-[18px] font-semibold tracking-tight">New client</h3>
                <p className="text-[11.5px] text-dim">
                  Creates the funnel, review QR and portal automatically.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-faint hover:bg-panel2 hover:text-chalk">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Business name">
                  <input required value={form.name} onChange={set("name")} className="input" placeholder="Sharma Dental" />
                </Field>
                <Field label="Owner name">
                  <input value={form.contactName} onChange={set("contactName")} className="input" placeholder="Dr. Sharma" />
                </Field>
                <Field label="Niche">
                  <select value={form.niche} onChange={set("niche")} className="input">
                    {NICHES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Area">
                  <input value={form.area} onChange={set("area")} className="input" placeholder="Swaroop Nagar" />
                </Field>
                <Field label="WhatsApp number">
                  <input required value={form.phone} onChange={set("phone")} className="input" placeholder="98765 43210" />
                </Field>
                <Field label="Monthly retainer (₹)">
                  <input type="number" value={form.monthlyFee} onChange={set("monthlyFee")} className="input" />
                </Field>
              </div>
              <Field label="Primary offer">
                <input
                  value={form.offerTitle}
                  onChange={set("offerTitle")}
                  className="input"
                  placeholder="₹199 Full Checkup + X-Ray"
                />
              </Field>

              {error && <p className="text-[12px] text-rose">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-quiet h-9">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary h-9">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block text-[10px]">{label}</span>
      {children}
    </label>
  );
}
