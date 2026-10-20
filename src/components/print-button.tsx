"use client";

import { Printer, Check } from "lucide-react";
import { useState } from "react";

export function PrintButton() {
  const [hint, setHint] = useState(false);
  return (
    <button
      onClick={() => {
        setHint(true);
        setTimeout(() => window.print(), 120);
        setTimeout(() => setHint(false), 3000);
      }}
      className="btn-primary h-9 px-3 text-[12px]"
    >
      {hint ? <Check className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />}
      {hint ? "Opening print…" : "Print standee"}
    </button>
  );
}
