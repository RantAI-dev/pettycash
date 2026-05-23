"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Inbox, Plus, TrendingUp, Wallet } from "lucide-react";
import { sel, useStore } from "@/store/store";
import { fmtIDR, fmtRelTime, firstName } from "@/lib/format";
import { Avatar, Badge, Button, Card, Empty, ProgressBar, StatusBadge } from "@/components/ui/primitives";
import { useNewTx } from "@/components/NewTransactionModal";
import type { Transaction, User } from "@/lib/types";

export const catColor = (cat: string): string => {
  const map: Record<string, string> = {
    "Bensin": "#bb7851",
    "Transportasi": "#517fbb",
    "Konsumsi": "#80cb87",
    "ATK": "#388ca1",
    "Parkir": "#574399",
    "Operasional": "#5eb6fa",
    "Entertainment Client": "#bb5153",
    "Lain-lain": "#32836a",
  };
  return map[cat] || "#5eb6fa";
};

export default function DashboardPage() {
  const { state, currentUser } = useStore();
  const newTx = useNewTx();

  const balance = state.fund.currentBalance;
  const ceiling = state.fund.ceiling;
  const thisMonth = sel.spendThisMonth(state);
  const lastMonth = sel.spendLastMonth(state);
  const pctChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
  const pending = sel.pendingActionCountForUser(state, currentUser);
  const recent = state.transactions.slice(0, 8);
  const byCat = sel.spendByCategoryThisMonth(state);
  const maxCat = byCat.length ? byCat[0][1] : 1;

  const isApprover = currentUser.role !== "requester";
  const actionList = isApprover
    ? sel.pendingVerifications(state).slice(0, 6)
    : sel.myTransactions(state, currentUser.id).filter((t) => t.status === "rejected").slice(0, 6);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-subtitle">Dashboard · {currentUser.divisi}</div>
          <h1 className="page-title">Halo, {firstName(currentUser.name)}.</h1>
        </div>
        <Button variant="primary" icon={Plus} size="lg" onClick={newTx.open}>
          Laporkan Pengeluaran
        </Button>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <StatCardBalance balance={balance} ceiling={ceiling} />
        <StatCardSpend value={thisMonth} pctChange={pctChange} />
        <StatCardPending count={pending} user={currentUser} />
      </div>

      <Card
        flush
        header="Transaksi Terbaru"
        headerActions={
          <Link
            href="/transactions"
            className="mono dim"
            style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            Lihat Semua →
          </Link>
        }
        style={{ marginBottom: 20 }}
      >
        <RecentTxTable transactions={recent} />
      </Card>

      <div className="grid-2">
        <Card header="Pengeluaran per Kategori (Bulan Ini)">
          {byCat.length === 0 ? (
            <Empty icon={BarChart3} title="Belum ada pengeluaran" body="Pengeluaran bulan ini akan muncul di sini." />
          ) : (
            <div className="bar-chart" style={{ marginTop: 8 }}>
              {byCat.map(([cat, amt]) => (
                <div key={cat} className="bar-row">
                  <span className="label">{cat}</span>
                  <div className="bar-bg">
                    <div className="bar-fill" style={{ width: `${(amt / maxCat) * 100}%`, background: catColor(cat) }} />
                  </div>
                  <span className="val">{fmtIDR(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          header={isApprover ? "Menunggu Verifikasi Anda" : "Laporan Ditolak / Butuh Revisi"}
          headerActions={
            isApprover ? (
              <Link href="/approvals" className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Buka Verifikasi →
              </Link>
            ) : (
              <Link href="/transactions" className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Lihat Semua →
              </Link>
            )
          }
        >
          {actionList.length === 0 ? (
            <Empty
              icon={CheckCircle2}
              title={isApprover ? "Tidak ada yang menunggu verifikasi" : "Tidak ada laporan yang ditolak"}
              body={
                isApprover
                  ? "Saat ada laporan baru, akan muncul di sini."
                  : "Semua laporan Anda aman. Bagus!"
              }
            />
          ) : (
            <div className="col" style={{ gap: 6, marginTop: 4 }}>
              {actionList.map((tx) => {
                const u = sel.userById(state, tx.requesterId);
                return (
                  <Link
                    key={tx.id}
                    href={`/transactions/${tx.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      transition: "background 150ms",
                    }}
                  >
                    <Avatar user={u} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description}
                      </div>
                      <div
                        className="mono dim"
                        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}
                      >
                        {tx.id} · {u?.name?.split(" ").slice(0, 2).join(" ")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="mono" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                        {fmtIDR(tx.amount)}
                      </div>
                      <div className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {fmtRelTime(tx.createdAt)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function StatCardBalance({ balance, ceiling }: { balance: number; ceiling: number }) {
  const pct = (balance / ceiling) * 100;
  const low = pct < 30;
  return (
    <div className="stat-card">
      <div className="label">
        <Wallet size={13} /> Saldo Petty Cash
      </div>
      <div className="value">{fmtIDR(balance)}</div>
      <ProgressBar value={balance} max={ceiling} />
      <div className="progress-meta">
        <span>{Math.round(pct)}% terisi</span>
        <span>Plafon {fmtIDR(ceiling)}</span>
      </div>
      {low && (
        <div className="mono" style={{ fontSize: 11, color: "#d8a07a", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <AlertTriangle size={12} /> Saldo rendah — pertimbangkan top-up
        </div>
      )}
    </div>
  );
}

function StatCardSpend({ value, pctChange }: { value: number; pctChange: number | null }) {
  return (
    <div className="stat-card">
      <div className="label">
        <TrendingUp size={13} /> Pengeluaran Bulan Ini
      </div>
      <div className="value">{fmtIDR(value)}</div>
      <div style={{ height: 6 }} />
      {pctChange == null ? (
        <div className="delta dim">Data bulan lalu tidak tersedia</div>
      ) : (
        <div className={`delta ${pctChange < 0 ? "down" : "up"}`}>
          {pctChange < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
          {Math.abs(pctChange).toFixed(1)}% vs bulan lalu
        </div>
      )}
    </div>
  );
}

function StatCardPending({ count, user }: { count: number; user: User }) {
  const label = user.role === "requester" ? "Laporan butuh revisi" : "Bukti menunggu verifikasi";
  return (
    <div className="stat-card">
      <div className="label">
        <Inbox size={13} /> Pending Action
      </div>
      <div className="value" style={{ color: count > 0 ? "var(--brand-sky)" : "#fff" }}>
        {count}
      </div>
      <div className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </div>
      {count > 0 && (
        <Link
          href={user.role === "requester" ? "/transactions?status=rejected" : "/approvals"}
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "var(--brand-sky)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Tindak lanjuti →
        </Link>
      )}
    </div>
  );
}

function RecentTxTable({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter();
  const { state } = useStore();
  if (!transactions.length) {
    return (
      <div style={{ padding: 24 }}>
        <Empty title="Belum ada transaksi" body="Laporkan pengeluaran pertama Anda dari tombol di atas." />
      </div>
    );
  }
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Pemohon</th>
            <th>Deskripsi</th>
            <th>Kategori</th>
            <th className="num">Jumlah</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const u = sel.userById(state, tx.requesterId);
            return (
              <tr key={tx.id} onClick={() => router.push(`/transactions/${tx.id}`)}>
                <td className="mono dim" style={{ whiteSpace: "nowrap" }}>{new Date(tx.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td>
                  <span className="avatar-row">
                    <Avatar user={u} size="sm" />
                    <span className="name">{u?.name}</span>
                  </span>
                </td>
                <td className="ellip">{tx.description}</td>
                <td>
                  <Badge category>{tx.category}</Badge>
                </td>
                <td className="num">{fmtIDR(tx.amount)}</td>
                <td>
                  <StatusBadge status={tx.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
