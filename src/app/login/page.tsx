import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { agencyName } from "@/lib/env";

export const dynamic = "force-dynamic";

const PILLARS = [
  "Hinglish reels rendered in seconds",
  "WhatsApp leads, not vanity clicks",
  "Google Maps reviews on autopilot",
];

export default async function LoginPage() {
  if (await isAuthed()) redirect("/");
  const passcode = process.env.AGENCY_PASSCODE || "kanpur2026";
  const showHint = passcode === "kanpur2026";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-[#080a0e] p-12 lg:flex">
        <div className="absolute inset-0 aurora opacity-40" />
        <div className="absolute inset-0 grain opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-[17px] font-black text-ink">
              G
            </span>
            <div>
              <p className="text-[15px] font-bold tracking-tight">{agencyName()}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-faint">
                AI Ad Agency · Kanpur
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="label mb-4 text-lime">Local growth engine</p>
          <h1 className="text-[40px] font-semibold leading-[1.08] tracking-tight">
            The ad agency that <span className="text-lime">never stops</span> testing.
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-dim">
            One dashboard for every client in Kanpur — AI hooks, 1080p reels, WhatsApp
            leads and review velocity, all on autopilot.
          </p>
          <div className="mt-8 space-y-2.5">
            {PILLARS.map((p) => (
              <div key={p} className="flex items-center gap-2.5 text-[12.5px] text-chalk/90">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-lime/15 text-[9px] text-lime">
                  ✓
                </span>
                {p}
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            ["< 8s", "1080p render"],
            ["97%", "gross margin"],
            ["7.1x", "blended ROAS"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl border border-line bg-panel/60 p-3 backdrop-blur">
              <p className="text-[19px] font-semibold tracking-tight">{v}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-faint">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[340px] rise">
          <div className="mb-8 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime text-[18px] font-black text-ink">
              G
            </span>
          </div>
          <p className="label mb-2">Agency workspace</p>
          <h2 className="text-[26px] font-semibold tracking-tight">Welcome back</h2>
          <p className="mb-7 mt-1 text-[13px] text-dim">
            Client data, live campaigns and renders are behind this door.
          </p>
          <LoginForm hint={showHint ? passcode : undefined} />
        </div>
      </div>
    </div>
  );
}
