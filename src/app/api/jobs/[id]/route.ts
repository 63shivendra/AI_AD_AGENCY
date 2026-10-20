import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  let result: unknown = null;
  if (job.result) {
    try {
      result = JSON.parse(job.result);
    } catch {
      result = null;
    }
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    result,
  });
}
