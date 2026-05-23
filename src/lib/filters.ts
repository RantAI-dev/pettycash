import type { AppState, Status, Transaction } from "@/lib/types";

export interface TxFilters {
  search?: string;
  statuses?: string[];
  category?: string;
  project?: string;
  requesterId?: string;
  period?: string; // preset key
  dateFrom?: string; // ISO yyyy-mm-dd
  dateTo?: string; // ISO yyyy-mm-dd
}

export interface ResolvedRange {
  from: number;
  to: number;
  label: string | null;
}

export const PERIOD_PRESETS: Array<{ value: string; label: string }> = [
  { value: "", label: "Semua Periode" },
  { value: "today", label: "Hari Ini" },
  { value: "7d", label: "7 Hari Terakhir" },
  { value: "30d", label: "30 Hari Terakhir" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_month", label: "Bulan Lalu" },
  { value: "this_quarter", label: "Kuartal Ini" },
  { value: "ytd", label: "Tahun Berjalan (YTD)" },
  { value: "custom", label: "Custom" },
];

export function periodRange(preset: string): { from: number; to: number } | null {
  const now = new Date();
  if (preset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return { from: start, to: Date.now() };
  }
  if (preset === "7d") return { from: Date.now() - 7 * 86400000, to: Date.now() };
  if (preset === "30d") return { from: Date.now() - 30 * 86400000, to: Date.now() };
  if (preset === "this_month")
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: Date.now() };
  if (preset === "last_month")
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth(), 1).getTime() - 1,
    };
  if (preset === "this_quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { from: new Date(now.getFullYear(), q * 3, 1).getTime(), to: Date.now() };
  }
  if (preset === "ytd") return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: Date.now() };
  return null;
}

export function resolveRange(filters: TxFilters): ResolvedRange | null {
  if (filters.period === "custom" || filters.period == null || filters.period === "") {
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0;
      const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 86400000 : Date.now() + 86400000;
      return { from, to, label: "Custom" };
    }
    return null;
  }
  const r = periodRange(filters.period);
  if (!r) return null;
  const preset = PERIOD_PRESETS.find((p) => p.value === filters.period);
  return { from: r.from, to: r.to, label: preset?.label ?? null };
}

export function applyFilters(state: AppState, filters: TxFilters): Transaction[] {
  const range = resolveRange(filters);
  const search = (filters.search || "").toLowerCase().trim();
  const statuses = filters.statuses || [];
  const category = filters.category || "";
  const project = filters.project || "";
  const requesterId = filters.requesterId || "";

  return state.transactions.filter((tx) => {
    if (search) {
      const u = state.users.find((u) => u.id === tx.requesterId);
      const hay = `${tx.id} ${tx.description} ${tx.project ?? ""} ${u?.name ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (statuses.length && !statuses.includes(tx.status)) return false;
    if (category && tx.category !== category) return false;
    if (project && tx.project !== project) return false;
    if (requesterId && tx.requesterId !== requesterId) return false;
    if (range) {
      if (tx.createdAt < range.from) return false;
      if (tx.createdAt > range.to) return false;
    }
    return true;
  });
}

export function filtersFromSearchParams(sp: URLSearchParams): TxFilters {
  return {
    search: sp.get("search") || undefined,
    statuses: sp.get("statuses")?.split(",").filter(Boolean) || undefined,
    category: sp.get("category") || undefined,
    project: sp.get("project") || undefined,
    requesterId: sp.get("requesterId") || undefined,
    period: sp.get("period") || undefined,
    dateFrom: sp.get("dateFrom") || undefined,
    dateTo: sp.get("dateTo") || undefined,
  };
}

export function filtersToSearchParams(filters: TxFilters): string {
  const sp = new URLSearchParams();
  if (filters.search) sp.set("search", filters.search);
  if (filters.statuses?.length) sp.set("statuses", filters.statuses.join(","));
  if (filters.category) sp.set("category", filters.category);
  if (filters.project) sp.set("project", filters.project);
  if (filters.requesterId) sp.set("requesterId", filters.requesterId);
  if (filters.period) sp.set("period", filters.period);
  if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) sp.set("dateTo", filters.dateTo);
  return sp.toString();
}

// Re-export Status to satisfy unused-import linters when consumers narrow
export type { Status };
