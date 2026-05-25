import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  try {
    await requireRole(["finance_admin", "super_admin"]);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Hanya finance/super admin yang bisa menolak top-up" }, { status: 403 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rows = await db.select().from(schema.cycles).where(eq(schema.cycles.id, id)).limit(1);
  const cyc = rows[0];
  if (!cyc) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (cyc.status !== "requested") {
    return NextResponse.json({ error: "Top-up cycle tidak dalam status menunggu approval" }, { status: 400 });
  }

  await db.update(schema.cycles).set({ status: "rejected" }).where(eq(schema.cycles.id, id));
  return NextResponse.json({ ok: true });
}
