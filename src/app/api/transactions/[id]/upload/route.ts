import { NextResponse } from "next/server";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  files: Array<{ fileName: string; imgData: string | null; mimeType?: string; fileSize?: number }>;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  const actorId = await requireUserId();
  const body = (await req.json()) as Body;
  const files = body.files || [];
  if (!files.length) return NextResponse.json({ error: "no files" }, { status: 400 });

  const now = Date.now();
  await db.insert(schema.attachments).values(
    files.map((f, i) => ({
      id: `att_${now}_${i}`,
      transactionId: id,
      fileName: f.fileName,
      imgData: f.imgData,
      mimeType: f.mimeType ?? null,
      fileSize: f.fileSize ?? null,
      uploadedBy: actorId,
      uploadedAt: now,
      kind: "bukti",
    })),
  );
  await db.insert(schema.events).values({
    id: `evt_${now}_u`,
    transactionId: id,
    actorId,
    eventType: "bukti_uploaded",
    payload: { count: files.length },
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}
