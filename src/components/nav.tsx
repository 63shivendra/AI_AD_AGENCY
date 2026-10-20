"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Users,
  Wand2,
  Film,
  Inbox,
  Radar,
  Wallet,
  Settings2,
  QrCode,
  LogOut,
  Search,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/studio", label: "Ad Studio", icon: Wand2 },
  { href: "/ads", label: "Ad library", icon: Film },
  { href: "/leads", label: "Lead inbox", icon: Inbox },
  { href: "/radar", label: "Competitor radar", icon: Radar },
  { href: "/billing", label: "Revenue", icon: Wallet },
];

const SECONDARY = [
  { href: "/demo", label: "Demo kit", icon: QrCode },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

const TITLES: Record<string, { title: string; crumb: string }> = {
  "/": { title: "Overview", crumb: "Workspace" },
  "/clients": { title: "Clients", crumb: "Workspace" },
  "/studio": { title: "Ad Studio", crumb: "Creative" },
  "/ads": { title: "Ad library", crumb: "Creative" },
  "/leads": { title: "Lead inbox", crumb: "Demand" },
  "/radar": { title: "Competitor radar", crumb: "Intelligence" },
  "/billing": { title: "Revenue", crumb: "Business" },
  "/demo": { title: "Demo kit", crumb: "Showcase" },
  "/settings": { title: "Settings", crumb: "System" },
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ agencyName }: { agencyName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const links = (
    <>
      <div className="px-3">
        <p className="label mb-2 px-2">Workspace</p>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                  active
                    ? "bg-lime/10 text-lime"
                    : "text-dim hover:bg-panel2 hover:text-chalk"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {item.label}
                {item.href === "/leads" && (
                  <span className="ml-auto rounded-full bg-violet/15 px-1.5 py-0.5 text-[9.5px] font-bold text-violet">
                    live
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 px-3">
        <p className="label mb-2 px-2">Showcase</p>
        <nav className="space-y-0.5">
          {SECONDARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                  active ? "bg-lime/10 text-lime" : "text-dim hover:bg-panel2 hover:text-chalk"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-3 px-3 pb-4">
        <div className="rounded-xl border border-lime/20 bg-lime/[0.06] p-3">
          <div className="flex items-center gap-2">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" />
            <p className="text-[11.5px] font-bold text-lime">Autopilot ON</p>
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-dim">
            6 systems live. Creative refresh runs every 48h.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-panel2 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/15 text-[12px] font-bold text-violet">
            SS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold">Agency admin</p>
            <p className="truncate text-[10px] text-faint">{agencyName} · Kanpur</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-ink hover:text-rose"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* mobile trigger lives in Topbar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-line bg-[#090b0f] py-4 min-[880px]:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-lime text-[15px] font-black text-ink">
            G
          </span>
          <span>
            <span className="block text-[14px] font-bold leading-tight tracking-tight">{agencyName}</span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-faint">
              Kanpur · AI Agency
            </span>
          </span>
        </Link>
        {links}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 min-[880px]:hidden">
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[260px] flex-col border-r border-line bg-[#090b0f] py-4">
            <div className="mb-4 flex items-center justify-between px-5">
              <span className="text-[14px] font-bold">{agencyName}</span>
              <button onClick={() => setOpen(false)} className="text-dim">
                <X className="h-4 w-4" />
              </button>
            </div>
            {links}
          </aside>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel text-chalk shadow-xl min-[880px]:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const meta =
    TITLES[pathname] ??
    (pathname.startsWith("/clients")
      ? { title: "Client", crumb: "Workspace" }
      : { title: "Workspace", crumb: "Growth Engine" });

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-5 lg:px-8">
        <div className="hidden items-center gap-1.5 text-[11.5px] text-faint sm:flex">
          <span>{meta.crumb}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-dim">{meta.title}</span>
        </div>

        <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(q.trim() ? `/clients?q=${encodeURIComponent(q.trim())}` : "/clients");
            }}
            className="relative hidden w-[220px] md:block"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search clients…"
              className="h-8 w-full rounded-lg border border-line bg-panel pl-8 pr-3 text-[12px] text-chalk outline-none placeholder:text-faint focus:border-line2"
            />
          </form>

          <span className="hidden items-center gap-1.5 rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 text-[10.5px] font-bold text-mint sm:flex">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint" />
            All systems live
          </span>

          <Link
            href="/studio"
            className="btn-primary h-8 px-3 text-[12px]"
          >
            <Wand2 className="h-3.5 w-3.5" />
            New ad
          </Link>
        </div>
      </div>
    </header>
  );
}
