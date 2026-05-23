import { NextResponse } from "next/server";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  const actorId = await requireUserId();
  const body = (await req.json()) as { note?: string };
  const note = (body.note || "").trim();
  if (!note) return NextResponse.json({ error: "note required" }, { status: 400 });
  const now = Date.now();
  await db.insert(schema.events).values({
    id: `evt_${now}_n`,
    transactionId: id,
    actorId,
    eventType: "note_added",
    payload: { note },
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}
