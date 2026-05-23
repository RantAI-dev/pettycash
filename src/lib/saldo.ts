import type { AppState, Transaction } from "@/lib/types";

/**
 * Compute the fund balance at a given point in time T.
 *
 * Definition: currentBalance reflects all verified transactions ever and all
 * completed top-up cycles ever. To rewind to time T, we ADD back any verified
 * transactions that happened after T (they hadn't deducted at T yet) and
 * SUBTRACT any completed cycles that landed after T (they hadn't been added
 * at T yet).
 *
 *   B(T) = currentBalance
 *        + Σ verified-tx with verifiedAt > T
 *        − Σ completed-cycle with approvedAt > T
 *
 * @param at  inclusive — balance "right at" T (events at exactly T are
 *            considered already applied).
 */
export function balanceAt(state: AppState, at: number): number {
  let bal = state.fund.currentBalance;
  for (const tx of state.transactions) {
    if (tx.verifiedAt && tx.verifiedAt > at && tx.status !== "rejected") {
      bal += tx.amount;
    }
  }
  for (const cyc of state.cycles) {
    if (cyc.status === "completed" && cyc.approvedAt && cyc.approvedAt > at) {
      bal -= cyc.approvedAmount ?? cyc.requestedAmount;
    }
  }
  return bal;
}

/**
 * Determine the effective time bounds for a report given the filtered tx set.
 * Falls back to min/max of the txs' createdAt if no explicit range supplied.
 */
export function reportBounds(
  transactions: Transaction[],
  range: { from: number; to: number } | null,
): { from: number; to: number } | null {
  if (range) return range;
  if (transactions.length === 0) return null;
  let from = Infinity;
  let to = -Infinity;
  for (const t of transactions) {
    if (t.createdAt < from) from = t.createdAt;
    const upper = t.verifiedAt ?? t.createdAt;
    if (upper > to) to = upper;
  }
  return Number.isFinite(from) && Number.isFinite(to) ? { from, to } : null;
}
