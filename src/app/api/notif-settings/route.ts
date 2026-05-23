import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import type { NotifSettings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request) {
  await ensureReady();
  const patch = (await req.json()) as Partial<NotifSettings>;
  const rows = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, "main")).limit(1);
  const cur = rows[0];
  if (!cur) return NextResponse.json({ error: "settings missing" }, { status: 404 });
  const next = { ...(cur.notifSettings as NotifSettings), ...patch };
  await db.update(schema.appSettings).set({ notifSettings: next }).where(eq(schema.appSettings.id, "main"));
  return NextResponse.json({ notifSettings: next });
}
