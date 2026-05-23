import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  newPassword?: string;
}

/**
 * Admin-override password reset. Used when a user forgets their password and
 * needs the super_admin to assign a new one.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  try {
    await requireRole(["super_admin"]);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Hanya super admin yang bisa reset password" }, { status: 403 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as Body;
  const next = body.newPassword ?? "";
  if (!next || next.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  const rows = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(schema.users.id, id));

  return NextResponse.json({ ok: true });
}
