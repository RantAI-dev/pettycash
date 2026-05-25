import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PatchBody {
  pic?: string | null;
  project?: string;
  category?: string;
  description?: string;
  spentDate?: string;
  verbalApproval?: string | null;
}

/**
 * Edit non-financial fields on a transaction. Amount, requester, status,
 * createdAt/verifiedAt/closedAt, and attachments are intentionally NOT
 * editable here — they affect saldo accounting or the audit trail and have
 * dedicated endpoints (verify/reject/close/upload).
 *
 * Each edit appends an `edited_draft` event so the change is visible in
 * the transaction's Riwayat. The fields that actually changed are recorded
 * in the event payload.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  const { id } = await ctx.params;
  const actorId = await requireUserId();
  const body = (await req.json()) as PatchBody;

  const rows = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
  const tx = rows[0];
  if (!tx) return NextResponse.json({ error: "transaction not found" }, { status: 404 });

  // Only allow editing while open. A closed transaction is frozen.
  if (tx.status === "closed") {
    return NextResponse.json({ error: "Transaksi sudah ditutup, tidak bisa diedit" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (body.pic !== undefined) {
    const next = body.pic?.trim() || null;
    if (next !== tx.pic) {
      patch.pic = next;
      changes.pic = { from: tx.pic, to: next };
    }
  }
  if (body.project !== undefined) {
    const next = body.project.trim() || "(Tanpa Proyek)";
    if (next !== tx.project) {
      patch.project = next;
      changes.project = { from: tx.project, to: next };
    }
  }
  if (body.category !== undefined) {
    const next = body.category.trim();
    if (next && next !== tx.category) {
      patch.category = next;
      changes.category = { from: tx.category, to: next };
    }
  }
  if (body.description !== undefined) {
    const next = body.description.trim();
    if (next && next !== tx.description) {
      patch.description = next;
      changes.description = { from: tx.description, to: next };
    }
  }
  if (body.spentDate !== undefined) {
    const next = body.spentDate;
    if (next && next !== tx.spentDate) {
      patch.spentDate = next;
      changes.spentDate = { from: tx.spentDate, to: next };
    }
  }
  if (body.verbalApproval !== undefined) {
    const next = body.verbalApproval?.trim() || null;
    if (next !== tx.verbalApproval) {
      patch.verbalApproval = next;
      changes.verbalApproval = { from: tx.verbalApproval, to: next };
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noChange: true });
  }

  await db.update(schema.transactions).set(patch).where(eq(schema.transactions.id, id));

  const now = Date.now();
  await db.insert(schema.events).values({
    id: `evt_${now}_e`,
    transactionId: id,
    actorId,
    eventType: "edited_draft",
    payload: { changes },
    createdAt: now,
  });

  return NextResponse.json({ ok: true, changedFields: Object.keys(changes) });
}
