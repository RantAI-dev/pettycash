import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  const actorId = await requireUserId();
  const body = (await req.json()) as { reason?: string };
  const reason = (body.reason || "").trim();
  if (!reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

  const txRows = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
  const tx = txRows[0];
  if (!tx) return NextResponse.json({ error: "transaction not found" }, { status: 404 });

  if (tx.status === "rejected") {
    return NextResponse.json({ ok: true, alreadyRejected: true });
  }
  if (tx.status === "closed") {
    return NextResponse.json({ error: "Transaksi sudah ditutup, tidak bisa ditolak lagi" }, { status: 400 });
  }
  // If the tx was already verified (balance was deducted), reverting it
  // requires also adding the amount back so the books stay balanced.
  const wasVerified = tx.status === "verified";

  await db.update(schema.transactions).set({ status: "rejected" }).where(eq(schema.transactions.id, id));
  const now = Date.now();
  await db.insert(schema.events).values({
    id: `evt_${now}_r`,
    transactionId: id,
    actorId,
    eventType: "rejected",
    payload: { reason, revertedVerification: wasVerified },
    createdAt: now,
  });

  if (wasVerified) {
    const fundRows = await db.select().from(schema.funds).limit(1);
    const fund = fundRows[0];
    if (fund) {
      await db
        .update(schema.funds)
        .set({ currentBalance: fund.currentBalance + tx.amount })
        .where(eq(schema.funds.id, fund.id));
    }
  }

  return NextResponse.json({ ok: true });
}
