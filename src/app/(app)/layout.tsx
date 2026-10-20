import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { Sidebar, Topbar } from "@/components/nav";
import { agencyName } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");

  return (
    <div className="min-h-screen bg-ink">
      <Sidebar agencyName={agencyName()} />
      <div className="min-[880px]:pl-[236px]">
        <Topbar />
        <main className="mx-auto w-full max-w-[1460px] px-5 py-6 min-[880px]:px-8 min-[880px]:py-7">{children}</main>
      </div>
    </div>
  );
}
