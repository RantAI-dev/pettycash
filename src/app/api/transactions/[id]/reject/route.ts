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

  await db.update(schema.transactions).set({ status: "rejected" }).where(eq(schema.transactions.id, id));
  const now = Date.now();
  await db.insert(schema.events).values({
    id: `evt_${now}_r`,
    transactionId: id,
    actorId,
    eventType: "rejected",
    payload: { reason },
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}
