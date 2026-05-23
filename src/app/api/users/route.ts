import { NextResponse } from "next/server";
import { db, ensureReady, schema } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface InviteBody {
  name: string;
  email: string;
  role: "requester" | "custodian" | "finance_admin" | "super_admin";
  divisi: string;
}

export async function POST(req: Request) {
  await ensureReady();
  const body = (await req.json()) as InviteBody;
  if (!body.email?.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const id = `u_${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(schema.users).values({
    id,
    name: body.name?.trim() || body.email.split("@")[0],
    email: body.email,
    role: body.role,
    divisi: body.divisi,
    active: true,
    lastLogin: null,
  });
  return NextResponse.json({ id });
}
