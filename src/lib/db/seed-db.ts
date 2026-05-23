import { db, ensureReady, schema } from "./client";
import { hashPassword } from "@/lib/auth";

const SUPER_ADMIN_DEFAULTS = {
  email: "admin@rantai.dev",
  name: "Super Admin",
  // Dev-only default. SUPER_ADMIN_PASSWORD env var MUST be set in production.
  password: "change-me-now",
};

const DEFAULT_CATEGORIES = [
  "Operasional",
  "Transportasi",
  "Konsumsi",
  "ATK",
  "Bensin",
  "Parkir",
  "Entertainment Client",
  "Lain-lain",
];

const DEFAULT_PROJECTS = ["(Tanpa Proyek)"];

const DEFAULT_NOTIF_SETTINGS = {
  onApproved: true,
  onRejected: true,
  onBuktiMissing: true,
  onTopUpApproved: true,
  onNoteAdded: false,
};

async function buildSuperAdminRow() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim() || SUPER_ADMIN_DEFAULTS.email;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || SUPER_ADMIN_DEFAULTS.name;
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SUPER_ADMIN_PASSWORD env var must be set when seeding in production");
    }
    console.warn(
      `[petty] SUPER_ADMIN_PASSWORD not set — using dev fallback "${SUPER_ADMIN_DEFAULTS.password}". Set it in .env.local.`,
    );
  }
  return {
    id: "u_admin",
    name,
    email,
    role: "super_admin" as const,
    divisi: process.env.SUPER_ADMIN_DIVISI?.trim() || "Operations",
    active: true,
    lastLogin: null,
    passwordHash: await hashPassword(password || SUPER_ADMIN_DEFAULTS.password),
  };
}

/**
 * Wipe & repopulate the database with the minimum bootstrap data:
 *   - one super_admin user (from env vars)
 *   - a default fund (custodian = super_admin initially)
 *   - default categories, projects and notification settings
 *
 * No demo users, no transactions, no top-up cycles, no notifications.
 * The super_admin invites real users from the Admin → Pengguna page and
 * sets the actual custodian via Admin → Pengaturan.
 *
 * Super admin env vars:
 *   - SUPER_ADMIN_EMAIL
 *   - SUPER_ADMIN_NAME
 *   - SUPER_ADMIN_PASSWORD (required in production)
 *   - SUPER_ADMIN_DIVISI (optional)
 */
export async function seedDatabase() {
  await ensureReady();
  const superAdmin = await buildSuperAdminRow();

  // Truncate in dependency-safe order
  await db.delete(schema.notifications);
  await db.delete(schema.events);
  await db.delete(schema.attachments);
  await db.delete(schema.transactions);
  await db.delete(schema.cycles);
  await db.delete(schema.funds);
  await db.delete(schema.users);
  await db.delete(schema.appSettings);

  // Single user: the super admin
  await db.insert(schema.users).values([superAdmin]);

  // Default fund with the super admin as the initial custodian.
  // Change the custodian (and other fund settings) once a real custodian has
  // been invited via Admin → Pengaturan.
  await db.insert(schema.funds).values({
    id: "fund_main",
    name: "Kas Operasional RantAI",
    ceiling: 50_000_000,
    currentBalance: 0,
    custodianId: superAdmin.id,
    preApprovalThreshold: 500_000,
    buktiSlaHours: 24,
  });

  // App settings
  await db.insert(schema.appSettings).values({
    id: "main",
    categories: DEFAULT_CATEGORIES,
    projects: DEFAULT_PROJECTS,
    notifSettings: DEFAULT_NOTIF_SETTINGS,
  });

  return {
    users: 1,
    transactions: 0,
    cycles: 0,
    events: 0,
    attachments: 0,
  };
}
