"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDashed,
  Download,
  SearchX,
  X as XIcon,
} from "lucide-react";
import { can, sel, useStore } from "@/store/store";
import {
  Avatar,
  AvatarRow,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Empty,
  StatusBadge,
} from "@/components/ui/primitives";
import { fmtDate, fmtDateTime, fmtIDR } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

export default function TopUpDetailPage() {
  const { state, currentUser, actions } = useStore();
  const toast = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cyc = state.cycles.find((c) => c.id === params.id);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  if (!cyc) {
    return (
      <div className="page">
        <Empty
          icon={SearchX}
          title="Top-up cycle tidak ditemukan"
          body="Cycle yang dimaksud tidak ada."
          action={
            <Button variant="outline" as="link" href="/topup">
              Kembali
            </Button>
          }
        />
      </div>
    );
  }

  const reqUser = sel.userById(state, cyc.requestedBy);
  const apprUser = cyc.approvedBy ? sel.userById(state, cyc.approvedBy) : undefined;
  const txs = state.transactions.filter(
    (t) =>
      t.verifiedAt && t.verifiedAt >= cyc.periodStart && t.verifiedAt <= cyc.periodEnd && t.status !== "rejected",
  );

  const handleApproveTopUp = async () => {
    try {
      await actions.approveTopUp(cyc.id);
      toast.success("Top-up disetujui", `${fmtIDR(cyc.requestedAmount)} ditambahkan ke saldo`);
    } catch (err) {
      toast.error("Gagal approve top-up", err instanceof Error ? err.message : String(err));
    }
  };

  const handleRejectTopUp = async () => {
    try {
      await actions.rejectTopUp(cyc.id);
      toast.info("Top-up ditolak", `Request ${fmtIDR(cyc.requestedAmount)} ditolak. Saldo tidak berubah.`);
    } catch (err) {
      toast.error("Gagal tolak top-up", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <Link href="/topup" className="icon-btn" style={{ marginTop: 4 }} aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <div className="page-subtitle">Top-Up Cycle</div>
          <div className="row" style={{ gap: 14, alignItems: "baseline", marginTop: 4, flexWrap: "wrap" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Periode {fmtDate(cyc.periodStart, { short: true })} – {fmtDate(cyc.periodEnd, { short: true })}
            </h1>
            <StatusBadge status={cyc.status} large />
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="outline"
            icon={Download}
            onClick={() => toast.info("Download PDF", "PDF cycle akan terbuka")}
          >
            Download PDF
          </Button>
          {cyc.status === "requested" && can.approveTopUp(currentUser) && (
            <>
              <Button variant="danger" icon={XIcon} onClick={() => setConfirmReject(true)}>
                Tolak Top-Up
              </Button>
              <Button variant="success" icon={Check} onClick={() => setConfirmApprove(true)}>
                Setujui Top-Up
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="label">Total Pengeluaran</div>
          <div className="value">{fmtIDR(cyc.totalSpent)}</div>
          <div className="mono dim" style={{ fontSize: 11 }}>
            {txs.length} transaksi
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Jumlah Top-Up</div>
          <div className="value">{fmtIDR(cyc.requestedAmount)}</div>
          <div className="mono dim" style={{ fontSize: 11 }}>
            {cyc.approvedAmount ? "Approved" : "Menunggu approval"}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Workflow</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            <div className="row" style={{ gap: 6, marginBottom: 6 }}>
              <CheckCircle2 size={13} style={{ color: "#8ed395" }} />
              Diajukan oleh {reqUser?.name?.split(" ")[0]}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {apprUser ? (
                <CheckCircle2 size={13} style={{ color: "#8ed395" }} />
              ) : (
                <CircleDashed size={13} style={{ color: "var(--muted-foreground)" }} />
              )}
              {apprUser ? `Disetujui oleh ${apprUser.name?.split(" ")[0]}` : "Menunggu Finance"}
            </div>
          </div>
        </div>
      </div>

      <Card flush header={`Transaksi dalam Periode (${txs.length})`} style={{ marginBottom: 20 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tgl Verifikasi</th>
                <th>ID</th>
                <th>Pemohon</th>
                <th>Deskripsi</th>
                <th>Kategori</th>
                <th className="num">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const u = sel.userById(state, t.requesterId);
                return (
                  <tr key={t.id} onClick={() => router.push(`/transactions/${t.id}`)}>
                    <td className="mono dim">{t.verifiedAt ? fmtDate(t.verifiedAt, { short: true }) : "—"}</td>
                    <td className="id-cell">{t.id}</td>
                    <td>
                      <AvatarRow user={u} />
                    </td>
                    <td className="ellip">{t.description}</td>
                    <td>
                      <Badge category>{t.category}</Badge>
                    </td>
                    <td className="num">{fmtIDR(t.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card header="Riwayat Approval Cycle">
        <div className="timeline">
          <div className="tl-event blue">
            <div className="tl-actor">
              {reqUser && <Avatar user={reqUser} size="sm" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>
                  {reqUser?.name} mengajukan top-up sebesar {fmtIDR(cyc.requestedAmount)}
                </div>
                <div className="tl-time">{fmtDateTime(cyc.requestedAt)}</div>
              </div>
            </div>
          </div>
          {cyc.status === "completed" && apprUser && cyc.approvedAt && (
            <div className="tl-event green">
              <div className="tl-actor">
                <Avatar user={apprUser} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>
                    {apprUser.name} menyetujui top-up · saldo kas ditambah {fmtIDR(cyc.approvedAmount ?? 0)}
                  </div>
                  <div className="tl-time">{fmtDateTime(cyc.approvedAt)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        onConfirm={handleApproveTopUp}
        title="Setujui top-up cycle?"
        message={`Akan menambahkan ${fmtIDR(cyc.requestedAmount)} ke saldo kas. Saldo baru akan menjadi ${fmtIDR(state.fund.currentBalance + cyc.requestedAmount)}. Aksi ini akan tercatat di audit log.`}
        confirmLabel="Setujui Top-Up"
      />

      <ConfirmDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        onConfirm={handleRejectTopUp}
        title="Tolak top-up cycle?"
        message={`Request top-up sebesar ${fmtIDR(cyc.requestedAmount)} akan ditandai sebagai ditolak. Saldo kas TIDAK berubah. Custodian harus mengajukan top-up baru kalau memang masih perlu.`}
        confirmLabel="Tolak Top-Up"
        danger
      />
    </div>
  );
}
