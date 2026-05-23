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
  const now = Date.now();
  await db
    .update(schema.transactions)
    .set({ status: "closed", closedAt: now })
    .where(eq(schema.transactions.id, id));
  await db.insert(schema.events).values({
    id: `evt_${now}_c`,
    transactionId: id,
    actorId,
    eventType: "closed",
    payload: {},
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}
