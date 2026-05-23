import { NextResponse } from "next/server";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  periodStart: number;
  periodEnd: number;
  totalSpent: number;
  requestedAmount: number;
}

export async function POST(req: Request) {
  await ensureReady();
  const body = (await req.json()) as Body;
  const requestedBy = await requireUserId();
  const id = `cycle_${Date.now()}`;
  await db.insert(schema.cycles).values({
    id,
    fundId: "fund_main",
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
    totalSpent: body.totalSpent,
    requestedAmount: body.requestedAmount,
    approvedAmount: null,
    status: "requested",
    requestedBy,
    approvedBy: null,
    requestedAt: Date.now(),
    approvedAt: null,
  });
  return NextResponse.json({ id });
}
