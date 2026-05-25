import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  const actorId = await requireUserId();

  const txRows = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
  const tx = txRows[0];
  if (!tx) return NextResponse.json({ error: "transaction not found" }, { status: 404 });

  // Idempotency: only flip status + deduct balance on the first verify. A
  // double-click or stale-tab retry must not re-deduct.
  if (tx.status === "verified" || tx.status === "closed") {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  if (tx.status === "rejected") {
    return NextResponse.json({ error: "Tidak bisa verifikasi transaksi yang sudah ditolak" }, { status: 400 });
  }

  const now = Date.now();
  await db
    .update(schema.transactions)
    .set({ status: "verified", verifiedAt: now })
    .where(eq(schema.transactions.id, id));

  await db.insert(schema.events).values({
    id: `evt_${now}_v`,
    transactionId: id,
    actorId,
    eventType: "verified",
    payload: {},
    createdAt: now,
  });

  const fundRows = await db.select().from(schema.funds).limit(1);
  const fund = fundRows[0];
  if (fund) {
    await db
      .update(schema.funds)
      .set({ currentBalance: fund.currentBalance - tx.amount })
      .where(eq(schema.funds.id, fund.id));
  }

  return NextResponse.json({ ok: true });
}
