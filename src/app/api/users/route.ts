import { NextResponse } from "next/server";
import { db, ensureReady, schema } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface InviteBody {
  name: string;
  email: string;
  role: "requester" | "custodian" | "finance_admin" | "super_admin";
  divisi: string;
  /** Optional initial password — when set, the new user can log in immediately. */
  password?: string;
}

export async function POST(req: Request) {
  await ensureReady();
  try {
    await requireRole(["super_admin"]);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Hanya super admin yang bisa membuat pengguna" }, { status: 403 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as InviteBody;
  if (!body.email?.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }
  if (body.password && body.password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const existing = await db.select({ email: schema.users.email }).from(schema.users);
  if (existing.some((u) => u.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "Email ini sudah terdaftar" }, { status: 409 });
  }

  const id = `u_${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = body.password ? await hashPassword(body.password) : null;

  await db.insert(schema.users).values({
    id,
    name: body.name?.trim() || email.split("@")[0],
    email,
    role: body.role,
    divisi: body.divisi,
    active: true,
    lastLogin: null,
    passwordHash,
  });

  return NextResponse.json({ id, canLogin: !!passwordHash });
}
