import type { AppState, User } from "./types";

const CATEGORIES = [
  "Operasional",
  "Transportasi",
  "Konsumsi",
  "ATK",
  "Bensin",
  "Parkir",
  "Entertainment Client",
  "Lain-lain",
];

const PROJECTS = ["(Tanpa Proyek)"];

const SUPER_ADMIN_PLACEHOLDER: User = {
  id: "u_admin",
  name: "Super Admin",
  email: "admin@rantai.dev",
  role: "super_admin",
  divisi: "Operations",
  active: true,
  lastLogin: null,
};

/**
 * Minimum AppState shape used as the initial useState value in StoreProvider
 * before the first /api/state fetch lands. Contains only the super-admin
 * placeholder, an empty fund, default categories/projects, and empty lists.
 *
 * The live DB seed (src/lib/db/seed-db.ts) is the source of truth — this
 * function exists just to satisfy the TypeScript shape during the brief
 * loading flash before hydration.
 */
export function buildInitialState(): AppState {
  return {
    users: [SUPER_ADMIN_PLACEHOLDER],
    fund: {
      id: "fund_main",
      name: "Kas Operasional RantAI",
      ceiling: 50_000_000,
      currentBalance: 0,
      custodianId: "u_admin",
      preApprovalThreshold: 500_000,
      buktiSlaHours: 24,
    },
    transactions: [],
    cycles: [],
    categories: CATEGORIES.slice(),
    projects: PROJECTS.slice(),
    currentUserId: "u_admin",
    notifications: [],
    sidebarCollapsed: false,
    notifSettings: {
      onApproved: true,
      onRejected: true,
      onBuktiMissing: true,
      onTopUpApproved: true,
      onNoteAdded: false,
    },
  };
}

