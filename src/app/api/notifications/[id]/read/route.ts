import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.id, id));
  return NextResponse.json({ ok: true });
}
