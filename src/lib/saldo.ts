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
 * Saldo "awal" and "akhir" as users intuit them for a report period:
 *
 *   Saldo Akhir = balance at the end-of-period instant (what the kas has now,
 *                 reflecting everything verified through `bounds.to`).
 *
 *   Saldo Awal  = Saldo Akhir + total period expenses
 *               = the opening balance such that
 *                    Saldo Awal − Pengeluaran Period = Saldo Akhir
 *
 * Top-ups that happen inside the period are folded into Saldo Awal — the
 * intuition is "I started the period with X, then spent Y, so I have X−Y
 * left." A top-up on day 1 of the period is treated as part of the setup
 * for that period (i.e. money that "was there when the period began").
 *
 * This matches the way custodians describe their petty cash in practice
 * and prevents the confusing case where saldo awal ≈ 0 because the period
 * starts right before the first top-up.
 */
export function saldoForPeriod(
  state: AppState,
  bounds: { from: number; to: number } | null,
): { awal: number; akhir: number; periodExpense: number } {
  // Saldo Akhir = balance at the end of period (or "now" if no bounds).
  const akhir = bounds ? balanceAt(state, bounds.to) : state.fund.currentBalance;

  // Total verified non-rejected expenses inside the period.
  let periodExpense = 0;
  if (bounds) {
    for (const tx of state.transactions) {
      if (
        tx.verifiedAt &&
        tx.verifiedAt >= bounds.from &&
        tx.verifiedAt <= bounds.to &&
        tx.status !== "rejected"
      ) {
        periodExpense += tx.amount;
      }
    }
  } else {
    // Whole-history report: all verified non-rejected count as "expense".
    for (const tx of state.transactions) {
      if (tx.verifiedAt && tx.status !== "rejected") periodExpense += tx.amount;
    }
  }

  const awal = akhir + periodExpense;
  return { awal, akhir, periodExpense };
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
