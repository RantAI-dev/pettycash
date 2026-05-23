import "server-only";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "./client";
import { seedDatabase } from "./seed-db";
import type {
  AppState,
  Attachment,
  Notification,
  Transaction,
  TopUpCycle,
  User,
  UserRole,
  NotifSettings,
} from "@/lib/types";

/**
 * Ensure the DB is seeded. Detects an empty fund table and runs the demo seed once.
 * Idempotent: a single concurrent call is gated by the row-count check.
 */
export async function ensureSeeded() {
  await ensureReady();
  const fundCount = await db.select({ id: schema.funds.id }).from(schema.funds).limit(1);
  if (fundCount.length === 0) {
    await seedDatabase();
  }
}

export async function getFullState(currentUserId: string): Promise<AppState> {
  await ensureSeeded();

  const [usersRows, fundRows, txRows, attRows, evtRows, cycRows, notifRows, settings] =
    await Promise.all([
      db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: schema.users.role,
          divisi: schema.users.divisi,
          active: schema.users.active,
          lastLogin: schema.users.lastLogin,
        })
        .from(schema.users),
      db.select().from(schema.funds),
      db.select().from(schema.transactions),
      db.select().from(schema.attachments),
      db.select().from(schema.events),
      db.select().from(schema.cycles),
      db.select().from(schema.notifications).where(eq(schema.notifications.userId, currentUserId)),
      db.select().from(schema.appSettings).where(eq(schema.appSettings.id, "main")).limit(1),
    ]);

  const fund = fundRows[0];

  const attByTx = new Map<string, Attachment[]>();
  for (const a of attRows) {
    const list = attByTx.get(a.transactionId) ?? [];
    list.push({
      id: a.id,
      fileName: a.fileName,
      imgData: a.imgData,
      mimeType: a.mimeType ?? undefined,
      fileSize: a.fileSize ?? undefined,
      uploadedBy: a.uploadedBy,
      uploadedAt: a.uploadedAt,
      kind: a.kind as Attachment["kind"],
    });
    attByTx.set(a.transactionId, list);
  }

  const evtByTx = new Map<string, Transaction["events"]>();
  for (const e of evtRows) {
    const list = evtByTx.get(e.transactionId) ?? [];
    list.push({
      id: e.id,
      transactionId: e.transactionId,
      actorId: e.actorId,
      eventType: e.eventType as Transaction["events"][number]["eventType"],
      payload: (e.payload as Record<string, unknown>) ?? {},
      createdAt: e.createdAt,
    });
    evtByTx.set(e.transactionId, list);
  }

  const transactions: Transaction[] = txRows
    .map((t) => ({
      id: t.id,
      fundId: t.fundId,
      requesterId: t.requesterId,
      custodianId: t.custodianId,
      amount: t.amount,
      category: t.category,
      project: t.project ?? "(Tanpa Proyek)",
      description: t.description,
      status: t.status as Transaction["status"],
      spentDate: t.spentDate,
      verbalApproval: t.verbalApproval,
      createdAt: t.createdAt,
      verifiedAt: t.verifiedAt,
      closedAt: t.closedAt,
      attachments: (attByTx.get(t.id) ?? []).sort((a, b) => a.uploadedAt - b.uploadedAt),
      events: (evtByTx.get(t.id) ?? []).sort((a, b) => a.createdAt - b.createdAt),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  const users: User[] = usersRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    divisi: u.divisi,
    active: u.active,
    lastLogin: u.lastLogin,
  }));

  const cycles: TopUpCycle[] = cycRows.map((c) => ({
    id: c.id,
    fundId: c.fundId,
    periodStart: c.periodStart,
    periodEnd: c.periodEnd,
    totalSpent: c.totalSpent,
    requestedAmount: c.requestedAmount,
    approvedAmount: c.approvedAmount,
    status: c.status as TopUpCycle["status"],
    requestedBy: c.requestedBy,
    approvedBy: c.approvedBy,
    requestedAt: c.requestedAt,
    approvedAt: c.approvedAt,
  }));

  const notifications: Notification[] = notifRows
    .map((n) => ({
      id: n.id,
      text: n.text,
      time: n.time,
      read: n.read,
      txId: n.txId ?? undefined,
    }))
    .sort((a, b) => b.time - a.time);

  const settingsRow = settings[0];
  return {
    users,
    fund: {
      id: fund.id,
      name: fund.name,
      ceiling: fund.ceiling,
      currentBalance: fund.currentBalance,
      custodianId: fund.custodianId,
      preApprovalThreshold: fund.preApprovalThreshold,
      buktiSlaHours: fund.buktiSlaHours,
    },
    transactions,
    cycles,
    categories: (settingsRow?.categories ?? []) as string[],
    projects: (settingsRow?.projects ?? []) as string[],
    currentUserId,
    notifications,
    sidebarCollapsed: false,
    notifSettings: (settingsRow?.notifSettings ?? {
      onApproved: true,
      onRejected: true,
      onBuktiMissing: true,
      onTopUpApproved: true,
      onNoteAdded: false,
    }) as NotifSettings,
  };
}

export { db, schema };
