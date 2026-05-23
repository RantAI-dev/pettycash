import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  currentPassword?: string;
  newPassword?: string;
}

export async function PATCH(req: Request) {
  await ensureReady();
  const uid = await requireUserId();

  const body = (await req.json()) as Body;
  const current = body.currentPassword ?? "";
  const next = body.newPassword ?? "";

  if (!current || !next) {
    return NextResponse.json({ error: "Password lama dan baru wajib diisi" }, { status: 400 });
  }
  if (next.length < 6) {
    return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ error: "Password baru harus berbeda dari yang lama" }, { status: 400 });
  }

  const rows = await db.select().from(schema.users).where(eq(schema.users.id, uid)).limit(1);
  const user = rows[0];
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await verifyPassword(current, user.passwordHash))) {
    return NextResponse.json({ error: "Password lama salah" }, { status: 401 });
  }

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(schema.users.id, uid));

  return NextResponse.json({ ok: true });
}
