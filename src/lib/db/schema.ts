import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // requester | custodian | finance_admin | super_admin
  divisi: text("divisi").notNull(),
  active: boolean("active").notNull().default(true),
  lastLogin: bigint("last_login", { mode: "number" }),
  passwordHash: text("password_hash"),
});

export const funds = pgTable("funds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ceiling: bigint("ceiling", { mode: "number" }).notNull(),
  currentBalance: bigint("current_balance", { mode: "number" }).notNull(),
  custodianId: text("custodian_id").notNull(),
  preApprovalThreshold: bigint("pre_approval_threshold", { mode: "number" }).notNull(),
  buktiSlaHours: integer("bukti_sla_hours").notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  fundId: text("fund_id").notNull(),
  requesterId: text("requester_id").notNull(),
  custodianId: text("custodian_id").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  category: text("category").notNull(),
  project: text("project").notNull().default("(Tanpa Proyek)"),
  pic: text("pic"),
  description: text("description").notNull(),
  status: text("status").notNull(),
  spentDate: text("spent_date").notNull(),
  verbalApproval: text("verbal_approval"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  verifiedAt: bigint("verified_at", { mode: "number" }),
  closedAt: bigint("closed_at", { mode: "number" }),
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull(),
  fileName: text("file_name").notNull(),
  imgData: text("img_data"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: bigint("uploaded_at", { mode: "number" }).notNull(),
  kind: text("kind").notNull().default("bukti"),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull(),
  actorId: text("actor_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const cycles = pgTable("cycles", {
  id: text("id").primaryKey(),
  fundId: text("fund_id").notNull(),
  periodStart: bigint("period_start", { mode: "number" }).notNull(),
  periodEnd: bigint("period_end", { mode: "number" }).notNull(),
  totalSpent: bigint("total_spent", { mode: "number" }).notNull(),
  requestedAmount: bigint("requested_amount", { mode: "number" }).notNull(),
  approvedAmount: bigint("approved_amount", { mode: "number" }),
  status: text("status").notNull(),
  requestedBy: text("requested_by").notNull(),
  approvedBy: text("approved_by"),
  requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
  approvedAt: bigint("approved_at", { mode: "number" }),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  text: text("text").notNull(),
  time: bigint("time", { mode: "number" }).notNull(),
  read: boolean("read").notNull().default(false),
  txId: text("tx_id"),
});

// Singleton-ish app settings (id = 'main')
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("main"),
  categories: jsonb("categories").notNull().$type<string[]>(),
  projects: jsonb("projects").notNull().$type<string[]>().default(sql`'[]'::jsonb`),
  notifSettings: jsonb("notif_settings").notNull().$type<{
    onApproved: boolean;
    onRejected: boolean;
    onBuktiMissing: boolean;
    onTopUpApproved: boolean;
    onNoteAdded: boolean;
  }>(),
});

export type UserRow = typeof users.$inferSelect;
export type FundRow = typeof funds.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type AttachmentRow = typeof attachments.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type CycleRow = typeof cycles.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type AppSettingsRow = typeof appSettings.$inferSelect;
