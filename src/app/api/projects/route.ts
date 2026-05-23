import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: Request) {
  await ensureReady();
  try {
    await requireRole(["super_admin"]);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Hanya super admin yang bisa mengubah proyek" }, { status: 403 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { projects: string[] };
  const projects = Array.from(
    new Set((body.projects || []).map((p) => p.trim()).filter(Boolean)),
  );
  const rows = await db
    .select({ id: schema.appSettings.id })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.id, "main"))
    .limit(1);
  if (!rows[0]) return NextResponse.json({ error: "settings missing" }, { status: 404 });
  await db.update(schema.appSettings).set({ projects }).where(eq(schema.appSettings.id, "main"));
  return NextResponse.json({ projects });
}
