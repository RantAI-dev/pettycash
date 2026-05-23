"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  Download,
  ExternalLink,
  FilePlus,
  Hourglass,
  Info,
  Lock,
  Send,
  TrendingDown,
} from "lucide-react";
import { can, sel, useStore } from "@/store/store";
import {
  AvatarRow,
  Badge,
  Button,
  Card,
  CurrencyInput,
  Empty,
  Field,
  Modal,
  StatusBadge,
} from "@/components/ui/primitives";
import { catColor, StatCardBalance } from "@/app/page";
import { fmtDate, fmtIDR, fmtRelTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import type { Transaction } from "@/lib/types";

export default function TopUpPage() {
  const { state, currentUser } = useStore();
  const router = useRouter();
  const [genOpen, setGenOpen] = useState(false);

  if (!can.viewTopUp(currentUser)) {
    return (
      <div className="page">
        <Empty
          icon={Lock}
          title="Tidak ada akses"
          body="Hanya custodian dan finance yang dapat membuka halaman top-up."
        />
      </div>
    );
  }

  const sorted = [...state.cycles].sort((a, b) => b.periodEnd - a.periodEnd);
  const current = sorted.find((c) => c.status === "requested" || c.status === "draft");
  const completed = sorted.filter((c) => c.status === "completed");
  const lastCompleted = completed[0];

  const periodStart = lastCompleted ? lastCompleted.periodEnd : Date.now() - 30 * 86400000;
  const periodEnd = Date.now();
  const currentPeriodTxs = state.transactions.filter(
    (t) => t.verifiedAt && t.verifiedAt >= periodStart && t.verifiedAt <= periodEnd && t.status !== "rejected",
  );
  const currentPeriodSpend = currentPeriodTxs.reduce((s, t) => s + t.amount, 0);
  const balance = state.fund.currentBalance;
  const ceiling = state.fund.ceiling;

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-subtitle">Finance Tool · {state.fund.name}</div>
          <h1 className="page-title">Top-Up Kas</h1>
        </div>
        <Button variant="primary" icon={FilePlus} onClick={() => setGenOpen(true)} disabled={!!current}>
          {current ? "Top-Up Sedang Diproses" : "Generate Laporan & Request Top-Up"}
        </Button>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <StatCardBalance balance={balance} ceiling={ceiling} />
        <div className="stat-card">
          <div className="label">
            <TrendingDown size={13} /> Total Pengeluaran Periode Berjalan
          </div>
          <div className="value">{fmtIDR(currentPeriodSpend)}</div>
          <div className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {currentPeriodTxs.length} transaksi
          </div>
        </div>
        <div className="stat-card">
          <div className="label">
            <CalendarRange size={13} /> Periode Berjalan
          </div>
          <div className="value" style={{ fontSize: 18 }}>
            {fmtDate(periodStart, { short: true })}
          </div>
          <div className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            s/d {fmtDate(periodEnd, { short: true })}
          </div>
        </div>
      </div>

      {current && (
        <Card style={{ marginBottom: 20, borderColor: "rgba(216, 160, 122, 0.3)", background: "rgba(216, 160, 122, 0.04)" }}>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <Hourglass size={20} style={{ color: "#d8a07a", flex: "none" }} />
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>
                Top-up sedang menunggu approval Finance
              </div>
              <div className="mono dim" style={{ fontSize: 12 }}>
                Periode {fmtDate(current.periodStart, { short: true })} – {fmtDate(current.periodEnd, { short: true })} · Diajukan oleh {sel.userById(state, current.requestedBy)?.name?.split(" ")[0]} {fmtRelTime(current.requestedAt)}
              </div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div
                className="mono"
                style={{ fontSize: 18, fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
              >
                {fmtIDR(current.requestedAmount)}
              </div>
              <div style={{ marginTop: 4 }}>
                <StatusBadge status={current.status} />
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card
        flush
        header="Riwayat Top-Up"
        headerActions={
          <span className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {sorted.length} cycle
          </span>
        }
      >
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Periode</th>
                <th className="num">Total Pengeluaran</th>
                <th className="num">Top-Up Amount</th>
                <th>Status</th>
                <th>Requested by</th>
                <th>Approved by</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((cyc) => {
                const reqUser = sel.userById(state, cyc.requestedBy);
                const apprUser = cyc.approvedBy ? sel.userById(state, cyc.approvedBy) : undefined;
                return (
                  <tr key={cyc.id} onClick={() => router.push(`/topup/${cyc.id}`)}>
                    <td>
                      <div style={{ fontSize: 13 }}>
                        {fmtDate(cyc.periodStart, { short: true })} – {fmtDate(cyc.periodEnd, { short: true })}
                      </div>
                      <div
                        className="mono dim"
                        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}
                      >
                        {Math.round((cyc.periodEnd - cyc.periodStart) / 86400000)} hari
                      </div>
                    </td>
                    <td className="num">{fmtIDR(cyc.totalSpent)}</td>
                    <td className="num">{fmtIDR(cyc.requestedAmount)}</td>
                    <td>
                      <StatusBadge status={cyc.status} />
                    </td>
                    <td>{reqUser ? <AvatarRow user={reqUser} /> : <span className="dim">—</span>}</td>
                    <td>
                      {apprUser ? (
                        <AvatarRow user={apprUser} />
                      ) : (
                        <span className="dim mono" style={{ fontSize: 11 }}>
                          menunggu
                        </span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => router.push(`/topup/${cyc.id}`)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <GenerateTopUpDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        period={{ start: periodStart, end: periodEnd }}
        transactions={currentPeriodTxs}
        totalSpent={currentPeriodSpend}
      />
    </div>
  );
}

function GenerateTopUpDialog({
  open,
  onClose,
  period,
  transactions,
  totalSpent,
}: {
  open: boolean;
  onClose: () => void;
  period: { start: number; end: number };
  transactions: Transaction[];
  totalSpent: number;
}) {
  const { actions } = useStore();
  const toast = useToast();
  const [requestedAmount, setRequestedAmount] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setRequestedAmount(Math.round((totalSpent * 1.05) / 100000) * 100000);
    }
  }, [open, totalSpent]);

  if (!open) return null;

  const byCat: Record<string, number> = {};
  for (const t of transactions) byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  const breakdown = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const handleSubmit = () => {
    actions.submitTopUp({
      periodStart: period.start,
      periodEnd: period.end,
      totalSpent,
      requestedAmount: requestedAmount || 0,
    });
    toast.success("Top-up diajukan", `Request ${fmtIDR(requestedAmount || 0)} dikirim ke Finance`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Laporan & Request Top-Up"
      subtitle="Top-Up Cycle"
      width="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="outline"
            icon={Download}
            onClick={() => toast.info("Preview PDF", "PDF preview akan terbuka di tab baru")}
          >
            Download PDF Preview
          </Button>
          <Button variant="primary" icon={Send} onClick={handleSubmit}>
            Submit Request Top-Up
          </Button>
        </>
      }
    >
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="label" style={{ fontSize: 10 }}>
            Total Pengeluaran
          </div>
          <div className="value" style={{ fontSize: 22 }}>
            {fmtIDR(totalSpent)}
          </div>
        </div>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="label" style={{ fontSize: 10 }}>
            Jumlah Transaksi
          </div>
          <div className="value" style={{ fontSize: 22 }}>
            {transactions.length}
          </div>
        </div>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="label" style={{ fontSize: 10 }}>
            Periode
          </div>
          <div className="value" style={{ fontSize: 14 }}>
            {fmtDate(period.start, { short: true })} – {fmtDate(period.end, { short: true })}
          </div>
        </div>
      </div>

      <div className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>
        Breakdown Kategori
      </div>
      <div className="bar-chart" style={{ marginBottom: 20 }}>
        {breakdown.map(([cat, amt]) => (
          <div key={cat} className="bar-row">
            <span className="label">{cat}</span>
            <div className="bar-bg">
              <div
                className="bar-fill"
                style={{ width: `${(amt / (breakdown[0][1] || 1)) * 100}%`, background: catColor(cat) }}
              />
            </div>
            <span className="val">{fmtIDR(amt)}</span>
          </div>
        ))}
      </div>

      <div className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>
        Detail Transaksi
      </div>
      <Card flush style={{ marginBottom: 20 }}>
        <div style={{ maxHeight: 240, overflowY: "auto" }}>
          <table className="tbl" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Tgl</th>
                <th>ID</th>
                <th>Deskripsi</th>
                <th>Kategori</th>
                <th className="num">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ cursor: "default" }}>
                  <td className="mono dim" style={{ whiteSpace: "nowrap" }}>
                    {t.verifiedAt ? fmtDate(t.verifiedAt, { short: true }) : "—"}
                  </td>
                  <td className="id-cell">{t.id}</td>
                  <td className="ellip" style={{ maxWidth: 240 }}>
                    {t.description}
                  </td>
                  <td>
                    <Badge category>{t.category}</Badge>
                  </td>
                  <td className="num">{fmtIDR(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Field label="Jumlah Top-Up yang Diminta" help="Default: 105% dari total pengeluaran (untuk buffer). Bisa disesuaikan.">
        <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} />
      </Field>

      <div
        className="mono dim"
        style={{
          fontSize: 11,
          padding: "10px 12px",
          background: "rgba(94,182,250,0.04)",
          border: "1px solid var(--hairline)",
          borderRadius: 8,
          marginTop: 8,
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <Info size={12} style={{ marginTop: 2 }} />
        <span>
          Setelah disubmit, request akan dikirim ke <span style={{ color: "#fff" }}>Pak Simon Hartono</span> (Finance) untuk approval. Begitu disetujui, saldo kas akan otomatis bertambah.
        </span>
      </div>
    </Modal>
  );
}
