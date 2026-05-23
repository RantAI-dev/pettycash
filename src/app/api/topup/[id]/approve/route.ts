import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  const approver = await requireUserId();
  const rows = await db.select().from(schema.cycles).where(eq(schema.cycles.id, id)).limit(1);
  const cyc = rows[0];
  if (!cyc) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (cyc.status !== "requested") {
    return NextResponse.json({ error: "cycle not pending" }, { status: 400 });
  }
  const now = Date.now();
  await db
    .update(schema.cycles)
    .set({
      status: "completed",
      approvedAmount: cyc.requestedAmount,
      approvedBy: approver,
      approvedAt: now,
    })
    .where(eq(schema.cycles.id, id));

  const fundRows = await db.select().from(schema.funds).limit(1);
  const fund = fundRows[0];
  if (fund) {
    await db
      .update(schema.funds)
      .set({ currentBalance: fund.currentBalance + cyc.requestedAmount })
      .where(eq(schema.funds.id, fund.id));
  }
  return NextResponse.json({ ok: true });
}
