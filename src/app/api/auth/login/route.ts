import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { ensureSeeded } from "@/lib/db/queries";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  // Bootstrap: on a brand-new DB the login route has to seed the super_admin
  // (everything else is gated behind auth, so /api/state never runs first).
  await ensureSeeded();
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Body harus JSON dengan email & password" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }

  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  const user = rows[0];
  // Verify even when no user found, to keep response timing similar
  const ok = user
    ? user.active && (await verifyPassword(password, user.passwordHash))
    : await verifyPassword(password, "scrypt$00$00");

  if (!user || !ok) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  await db.update(schema.users).set({ lastLogin: Date.now() }).where(eq(schema.users.id, user.id));
  await setSessionCookie(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      divisi: user.divisi,
    },
  });
}
