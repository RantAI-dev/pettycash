import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { getCurrentUserId, setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  return NextResponse.json({ userId });
}

/**
 * Impersonation endpoint. Only a super_admin can call this to swap the active
 * user (used by the sidebar "Demo: Login sebagai" switcher for testing other
 * role views without logging out).
 */
export async function POST(req: Request) {
  await ensureReady();
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, currentUserId)).limit(1);
  const current = rows[0];
  if (!current || current.role !== "super_admin") {
    return NextResponse.json({ error: "Hanya super admin yang bisa impersonasi" }, { status: 403 });
  }

  const body = (await req.json()) as { userId?: string };
  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const targetRows = await db.select().from(schema.users).where(eq(schema.users.id, body.userId)).limit(1);
  if (!targetRows[0]) {
    return NextResponse.json({ error: "Target user tidak ditemukan" }, { status: 404 });
  }

  await setSessionCookie(body.userId);
  return NextResponse.json({ userId: body.userId });
}
