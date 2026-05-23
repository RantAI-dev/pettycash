import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PatchBody {
  name?: string;
  role?: UserRole;
  divisi?: string;
  active?: boolean;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  const body = (await req.json()) as PatchBody;
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.role !== undefined) patch.role = body.role;
  if (body.divisi !== undefined) patch.divisi = body.divisi;
  if (body.active !== undefined) patch.active = body.active;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });
  await db.update(schema.users).set(patch).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}
