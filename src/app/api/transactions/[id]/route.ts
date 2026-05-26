import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";

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
 * Edit non-financial fields on a transaction. Super_admin only — owners
 * cannot edit their own once submitted; they need to reject + resubmit
 * via a new transaction, or ask super_admin to fix it.
 *
 * Amount, requester, status, createdAt/verifiedAt/closedAt and attachments
 * are intentionally NOT editable here — they affect saldo accounting or the
 * audit trail and have dedicated endpoints (verify/reject/close/upload).
 *
 * Each edit appends an `edited_draft` event so the change is visible in
 * the Riwayat. The fields that actually changed are recorded in the
 * event payload as a {from, to} diff.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  let actor;
  try {
    actor = await requireRole(["super_admin"]);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Hanya super admin yang bisa edit transaksi" }, { status: 403 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const actorId = actor.id;

  const { id } = await ctx.params;
  const body = (await req.json()) as PatchBody;

  const rows = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
  const tx = rows[0];
  if (!tx) return NextResponse.json({ error: "transaction not found" }, { status: 404 });

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

/**
 * Permanently delete a transaction. Super_admin only. If the transaction
 * was verified (so the balance was deducted), the amount is added back to
 * the fund first. All events + attachments linked to this tx are deleted.
 *
 * This is a hard delete — the audit trail for this transaction is gone.
 * Use sparingly (mistaken entries, test data); for legitimate revisions
 * prefer Reject + resubmit so the history stays intact.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureReady();
  try {
    await requireRole(["super_admin"]);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Hanya super admin yang bisa hapus transaksi" }, { status: 403 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rows = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
  const tx = rows[0];
  if (!tx) return NextResponse.json({ error: "transaction not found" }, { status: 404 });

  // Restore balance if this tx had been verified (and not rejected).
  // status='verified' or 'closed' means we deducted; 'rejected' means we
  // never deducted (or already reverted via the reject route).
  const needsRestore = tx.status === "verified" || tx.status === "closed";
  if (needsRestore) {
    const fundRows = await db.select().from(schema.funds).limit(1);
    const fund = fundRows[0];
    if (fund) {
      await db
        .update(schema.funds)
        .set({ currentBalance: fund.currentBalance + tx.amount })
        .where(eq(schema.funds.id, fund.id));
    }
  }

  // Cascade delete in dependency-safe order
  await db.delete(schema.events).where(eq(schema.events.transactionId, id));
  await db.delete(schema.attachments).where(eq(schema.attachments.transactionId, id));
  await db.delete(schema.transactions).where(eq(schema.transactions.id, id));

  return NextResponse.json({ ok: true, restoredBalance: needsRestore ? tx.amount : 0 });
}
