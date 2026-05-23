import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadSettings() {
  const rows = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, "main")).limit(1);
  return rows[0];
}

export async function PUT(req: Request) {
  await ensureReady();
  const body = (await req.json()) as { categories: string[] };
  const cats = Array.from(new Set((body.categories || []).map((c) => c.trim()).filter(Boolean)));
  const existing = await loadSettings();
  if (!existing) return NextResponse.json({ error: "settings missing" }, { status: 404 });
  await db
    .update(schema.appSettings)
    .set({ categories: cats })
    .where(eq(schema.appSettings.id, "main"));
  return NextResponse.json({ categories: cats });
}
