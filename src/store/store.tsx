"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildInitialState } from "@/lib/seed";
import type {
  AppState,
  Attachment,
  NotifSettings,
  TopUpCycle,
  Transaction,
  User,
  UserRole,
} from "@/lib/types";

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

interface CreateTransactionInput {
  amount: number;
  category: string;
  project?: string;
  pic?: string | null;
  description: string;
  spentDate: string;
  attachments: Array<{ fileName: string; imgData: string | null; mimeType?: string; fileSize?: number }>;
  verbalApproval?: string | null;
}

interface EditTransactionInput {
  pic?: string | null;
  project?: string;
  category?: string;
  description?: string;
  spentDate?: string;
  verbalApproval?: string | null;
}

interface Actions {
  switchUser: (userId: string) => Promise<void>;
  resetDemo: () => Promise<void>;
  createTransaction: (input: CreateTransactionInput) => Promise<string | null>;
  editTransaction: (txId: string, patch: EditTransactionInput) => Promise<void>;
  deleteTransaction: (txId: string) => Promise<{ restoredBalance: number }>;
  verifyTransaction: (txId: string) => Promise<void>;
  rejectTransaction: (txId: string, reason: string) => Promise<void>;
  closeTransaction: (txId: string) => Promise<void>;
  uploadBukti: (
    txId: string,
    files: Array<{ fileName: string; imgData: string | null; mimeType?: string; fileSize?: number }>,
  ) => Promise<void>;
  addNote: (txId: string, note: string) => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  inviteUser: (data: { name: string; email: string; role: UserRole; divisi: string; password?: string }) => Promise<{ id: string; canLogin: boolean }>;
  changeMyPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<void>;
  updateUser: (id: string, patch: Partial<User>) => Promise<void>;
  updateFund: (patch: Partial<AppState["fund"]>) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  setCategories: (list: string[]) => Promise<void>;
  addProject: (name: string) => Promise<void>;
  removeProject: (name: string) => Promise<void>;
  renameProject: (oldName: string, newName: string) => Promise<void>;
  setProjects: (list: string[]) => Promise<void>;
  submitTopUp: (
    data: Omit<TopUpCycle, "id" | "approvedAmount" | "status" | "approvedBy" | "requestedAt" | "approvedAt" | "requestedBy" | "fundId">,
  ) => Promise<void>;
  approveTopUp: (cycleId: string) => Promise<void>;
  rejectTopUp: (cycleId: string) => Promise<void>;
  setSidebarCollapsed: (v: boolean) => void;
  setNotifSettings: (patch: Partial<NotifSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

interface StoreApi {
  state: AppState;
  currentUser: User;
  actions: Actions;
  loading: boolean;
}

const StoreContext = createContext<StoreApi | null>(null);

const SIDEBAR_LOCAL_KEY = "petty-sidebar-collapsed";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(() => buildInitialState());
  const [loading, setLoading] = useState(true);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(async () => {
    try {
      const s = await api<AppState>("/api/state");
      // Sidebar pref is purely a UX toggle, keep it in localStorage so it's snappy.
      let collapsed = false;
      try {
        collapsed = localStorage.getItem(SIDEBAR_LOCAL_KEY) === "1";
      } catch {}
      setStateRaw({ ...s, sidebarCollapsed: collapsed });
    } catch (err) {
      console.error("Failed to load state from API:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const currentUser =
    state.users.find((u) => u.id === state.currentUserId) || state.users[0];

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setStateRaw((s) => ({ ...s, sidebarCollapsed: v }));
    try {
      localStorage.setItem(SIDEBAR_LOCAL_KEY, v ? "1" : "0");
    } catch {}
  }, []);

  const actions = useMemo<Actions>(
    () => ({
      refresh,
      setSidebarCollapsed,

      switchUser: async (userId) => {
        await api("/api/session", { method: "POST", body: JSON.stringify({ userId }) });
        await refresh();
      },

      resetDemo: async () => {
        await api("/api/demo-reset", { method: "POST" });
        await refresh();
      },

      createTransaction: async (input) => {
        const res = await api<{ id: string }>("/api/transactions", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await refresh();
        return res.id;
      },

      editTransaction: async (txId, patch) => {
        await api(`/api/transactions/${txId}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },

      deleteTransaction: async (txId) => {
        const res = await api<{ restoredBalance: number }>(`/api/transactions/${txId}`, { method: "DELETE" });
        await refresh();
        return res;
      },

      verifyTransaction: async (txId) => {
        await api(`/api/transactions/${txId}/verify`, { method: "POST" });
        await refresh();
      },
      rejectTransaction: async (txId, reason) => {
        await api(`/api/transactions/${txId}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
        await refresh();
      },
      closeTransaction: async (txId) => {
        await api(`/api/transactions/${txId}/close`, { method: "POST" });
        await refresh();
      },
      uploadBukti: async (txId, files) => {
        await api(`/api/transactions/${txId}/upload`, { method: "POST", body: JSON.stringify({ files }) });
        await refresh();
      },
      addNote: async (txId, note) => {
        await api(`/api/transactions/${txId}/note`, { method: "POST", body: JSON.stringify({ note }) });
        await refresh();
      },

      markNotifRead: async (id) => {
        await api(`/api/notifications/${id}/read`, { method: "POST" });
        // optimistic: avoid full refetch flicker
        setStateRaw((s) => ({
          ...s,
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },
      markAllNotifsRead: async () => {
        await api("/api/notifications/mark-all", { method: "POST" });
        setStateRaw((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      inviteUser: async (data) => {
        const res = await api<{ id: string; canLogin: boolean }>("/api/users", {
          method: "POST",
          body: JSON.stringify(data),
        });
        await refresh();
        return res;
      },
      changeMyPassword: async (currentPassword, newPassword) => {
        await api("/api/me/password", {
          method: "PATCH",
          body: JSON.stringify({ currentPassword, newPassword }),
        });
      },
      resetUserPassword: async (userId, newPassword) => {
        await api(`/api/users/${userId}/password`, {
          method: "PATCH",
          body: JSON.stringify({ newPassword }),
        });
      },
      updateUser: async (id, patch) => {
        await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      updateFund: async (patch) => {
        await api("/api/fund", { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },

      addCategory: async (name) => {
        const next = Array.from(new Set([...stateRef.current.categories, name.trim()].filter(Boolean)));
        await api("/api/categories", { method: "PUT", body: JSON.stringify({ categories: next }) });
        await refresh();
      },
      removeCategory: async (name) => {
        const next = stateRef.current.categories.filter((c) => c !== name);
        await api("/api/categories", { method: "PUT", body: JSON.stringify({ categories: next }) });
        await refresh();
      },
      renameCategory: async (oldName, newName) => {
        const next = stateRef.current.categories.map((c) => (c === oldName ? newName : c));
        await api("/api/categories", { method: "PUT", body: JSON.stringify({ categories: next }) });
        await refresh();
      },
      setCategories: async (list) => {
        await api("/api/categories", { method: "PUT", body: JSON.stringify({ categories: list }) });
        await refresh();
      },

      addProject: async (name) => {
        const next = Array.from(new Set([...stateRef.current.projects, name.trim()].filter(Boolean)));
        await api("/api/projects", { method: "PUT", body: JSON.stringify({ projects: next }) });
        await refresh();
      },
      removeProject: async (name) => {
        const next = stateRef.current.projects.filter((p) => p !== name);
        await api("/api/projects", { method: "PUT", body: JSON.stringify({ projects: next }) });
        await refresh();
      },
      renameProject: async (oldName, newName) => {
        const next = stateRef.current.projects.map((p) => (p === oldName ? newName : p));
        await api("/api/projects", { method: "PUT", body: JSON.stringify({ projects: next }) });
        await refresh();
      },
      setProjects: async (list) => {
        await api("/api/projects", { method: "PUT", body: JSON.stringify({ projects: list }) });
        await refresh();
      },

      submitTopUp: async (data) => {
        await api("/api/topup", {
          method: "POST",
          body: JSON.stringify({
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            totalSpent: data.totalSpent,
            requestedAmount: data.requestedAmount,
          }),
        });
        await refresh();
      },
      approveTopUp: async (cycleId) => {
        await api(`/api/topup/${cycleId}/approve`, { method: "POST" });
        await refresh();
      },
      rejectTopUp: async (cycleId) => {
        await api(`/api/topup/${cycleId}/reject`, { method: "POST" });
        await refresh();
      },

      setNotifSettings: async (patch) => {
        await api("/api/notif-settings", { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
    }),
    [refresh, setSidebarCollapsed],
  );

  const value: StoreApi = { state, currentUser, actions, loading };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const sel = {
  userById: (s: AppState, id: string) => s.users.find((u) => u.id === id),
  txById: (s: AppState, id: string) => s.transactions.find((t) => t.id === id),
  pendingVerifications: (s: AppState) => s.transactions.filter((t) => t.status === "reported"),
  myTransactions: (s: AppState, uid: string) => s.transactions.filter((t) => t.requesterId === uid),
  spendThisMonth: (s: AppState) => {
    const now = new Date();
    const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return s.transactions
      .filter((t) => t.verifiedAt && t.verifiedAt >= m0 && t.status !== "rejected")
      .reduce((sum, t) => sum + t.amount, 0);
  },
  spendLastMonth: (s: AppState) => {
    const now = new Date();
    const m0 = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const m1 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return s.transactions
      .filter((t) => t.verifiedAt && t.verifiedAt >= m0 && t.verifiedAt < m1 && t.status !== "rejected")
      .reduce((sum, t) => sum + t.amount, 0);
  },
  spendByCategoryThisMonth: (s: AppState): Array<[string, number]> => {
    const now = new Date();
    const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const m: Record<string, number> = {};
    for (const t of s.transactions) {
      if (t.verifiedAt && t.verifiedAt >= m0 && t.status !== "rejected") {
        m[t.category] = (m[t.category] || 0) + t.amount;
      }
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  },
  pendingActionCountForUser: (s: AppState, user: User | undefined): number => {
    if (!user) return 0;
    if (user.role === "requester") {
      return s.transactions.filter((t) => t.requesterId === user.id && t.status === "rejected").length;
    }
    if (["custodian", "finance_admin", "super_admin"].includes(user.role)) {
      const verifications = s.transactions.filter((t) => t.status === "reported").length;
      const topups = ["finance_admin", "super_admin"].includes(user.role)
        ? s.cycles.filter((c) => c.status === "requested").length
        : 0;
      return verifications + topups;
    }
    return 0;
  },
  allEvents: (s: AppState) => {
    const all = [] as Array<Transaction["events"][number] & { txAmount: number; txDescription: string }>;
    for (const tx of s.transactions) {
      for (const ev of tx.events) all.push({ ...ev, txAmount: tx.amount, txDescription: tx.description });
    }
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
};

export const can = {
  verify: (user: User | undefined) => ["custodian", "finance_admin", "super_admin"].includes(user?.role ?? ""),
  rejectTx: (user: User | undefined) => ["custodian", "finance_admin", "super_admin"].includes(user?.role ?? ""),
  closeTx: (user: User | undefined) => ["custodian", "finance_admin", "super_admin"].includes(user?.role ?? ""),
  uploadBukti: (user: User | undefined, tx: Transaction | undefined) =>
    user?.id === tx?.requesterId || ["custodian", "finance_admin", "super_admin"].includes(user?.role ?? ""),
  manageUsers: (user: User | undefined) => user?.role === "super_admin",
  manageFund: (user: User | undefined) => user?.role === "super_admin",
  viewAudit: (user: User | undefined) => user?.role === "super_admin",
  approveTopUp: (user: User | undefined) => ["finance_admin", "super_admin"].includes(user?.role ?? ""),
  viewVerify: (user: User | undefined) => ["custodian", "finance_admin", "super_admin"].includes(user?.role ?? ""),
  viewTopUp: (user: User | undefined) => ["custodian", "finance_admin", "super_admin"].includes(user?.role ?? ""),
};

// Avoid unused-attachment import warning
export type { Attachment };
