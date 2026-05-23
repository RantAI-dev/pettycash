import { NextResponse } from "next/server";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CreateBody {
  amount: number;
  category: string;
  project?: string;
  description: string;
  spentDate: string;
  attachments?: Array<{ fileName: string; imgData: string | null; mimeType?: string; fileSize?: number }>;
  verbalApproval?: string | null;
}

export async function POST(req: Request) {
  await ensureReady();
  const body = (await req.json()) as CreateBody;
  const requesterId = await requireUserId();

  if (!body.amount || body.amount <= 0) return NextResponse.json({ error: "amount required" }, { status: 400 });
  if (!body.category) return NextResponse.json({ error: "category required" }, { status: 400 });
  if (!body.description?.trim()) return NextResponse.json({ error: "description required" }, { status: 400 });

  const fundRows = await db.select().from(schema.funds).limit(1);
  const fund = fundRows[0];
  if (!fund) return NextResponse.json({ error: "fund not initialized" }, { status: 500 });

  // Generate a new ID by counting current rows. Race-condition-safe enough for this demo.
  const all = await db.select({ id: schema.transactions.id }).from(schema.transactions);
  const newId = `TXN-2026-${String(all.length + 1).padStart(4, "0")}`;
  const now = Date.now();

  await db.insert(schema.transactions).values({
    id: newId,
    fundId: fund.id,
    requesterId,
    custodianId: fund.custodianId,
    amount: body.amount,
    category: body.category,
    project: body.project?.trim() || "(Tanpa Proyek)",
    description: body.description.trim(),
    status: "reported",
    spentDate: body.spentDate || new Date().toISOString(),
    verbalApproval: body.verbalApproval?.trim() || null,
    createdAt: now,
    verifiedAt: null,
    closedAt: null,
  });

  const attachments = body.attachments ?? [];
  if (attachments.length > 0) {
    await db.insert(schema.attachments).values(
      attachments.map((f, i) => ({
        id: `att_${now}_${i}`,
        transactionId: newId,
        fileName: f.fileName,
        imgData: f.imgData,
        mimeType: f.mimeType ?? null,
        fileSize: f.fileSize ?? null,
        uploadedBy: requesterId,
        uploadedAt: now,
        kind: "bukti",
      })),
    );
  }

  const events = [
    { id: `evt_${now}_c`, transactionId: newId, actorId: requesterId, eventType: "created", payload: {} as Record<string, unknown>, createdAt: now },
  ];
  if (attachments.length > 0) {
    events.push({
      id: `evt_${now}_b`,
      transactionId: newId,
      actorId: requesterId,
      eventType: "bukti_uploaded",
      payload: { count: attachments.length },
      createdAt: now + 100,
    });
  }
  events.push({ id: `evt_${now}_s`, transactionId: newId, actorId: requesterId, eventType: "submitted", payload: {}, createdAt: now + 200 });
  await db.insert(schema.events).values(events);

  return NextResponse.json({ id: newId });
}
