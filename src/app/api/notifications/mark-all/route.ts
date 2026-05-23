import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  await ensureReady();
  const userId = await requireUserId();
  await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.userId, userId));
  return NextResponse.json({ ok: true });
}
