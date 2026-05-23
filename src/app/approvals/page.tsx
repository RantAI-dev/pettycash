"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Info,
  Lock,
  MessageCircle,
  X,
} from "lucide-react";
import { can, sel, useStore } from "@/store/store";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Empty,
  Field,
  Modal,
  Textarea,
} from "@/components/ui/primitives";
import { fmtDate, fmtIDR, fmtRelTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import type { AppState, Transaction } from "@/lib/types";

export default function ApprovalsPage() {
  const { state, currentUser, actions } = useStore();
  const toast = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!can.verify(currentUser)) {
    return (
      <div className="page">
        <Empty
          icon={Lock}
          title="Tidak ada akses"
          body="Hanya custodian dan finance yang dapat membuka halaman verifikasi."
        />
      </div>
    );
  }

  const reported = sel.pendingVerifications(state);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleVerify = (id: string) => {
    actions.verifyTransaction(id);
    toast.success("Diverifikasi", `${id} terverifikasi`);
  };
  const doReject = () => {
    if (!rejectReason.trim() || !rejectingId) {
      toast.error("Alasan diperlukan");
      return;
    }
    actions.rejectTransaction(rejectingId, rejectReason.trim());
    toast.info("Ditolak", `${rejectingId} ditolak`);
    setRejectingId(null);
    setRejectReason("");
  };
  const bulkVerify = () => {
    const ids = Array.from(selected);
    ids.forEach((id) => actions.verifyTransaction(id));
    toast.success(`${ids.length} bukti diverifikasi`);
    setSelected(new Set());
  };

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-subtitle">Inbox · {currentUser.role.replace("_", " ")}</div>
          <h1 className="page-title">Verifikasi Bukti</h1>
        </div>
        <div
          className="mono dim"
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            padding: "8px 12px",
            border: "1px solid var(--hairline)",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Info size={12} style={{ marginRight: 6, color: "var(--brand-sky)" }} />
          Approval pengeluaran via WA/lisan — di sini cek bukti
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16, gap: 8 }}>
        <Badge custom="cat" large>
          <ClipboardCheck size={12} style={{ marginRight: 6 }} />
          {reported.length} menunggu verifikasi
        </Badge>
      </div>

      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            background: "rgba(94,182,250,0.06)",
            border: "1px solid rgba(94,182,250,0.2)",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <span className="mono" style={{ fontSize: 12 }}>
            {selected.size} dipilih
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Batalkan pilihan
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="success" icon={CheckCheck} size="sm" onClick={() => setBulkConfirm(true)}>
            Verifikasi Semua
          </Button>
        </div>
      )}

      <Card flush>
        {reported.length === 0 ? (
          <div style={{ padding: 24 }}>
            <Empty
              icon={CheckCircle2}
              title="Tidak ada yang menunggu verifikasi"
              body="Saat ada laporan baru, akan muncul di sini."
            />
          </div>
        ) : (
          <div>
            {reported.map((tx) => (
              <VerifRow
                key={tx.id}
                tx={tx}
                state={state}
                expanded={expanded === tx.id}
                selected={selected.has(tx.id)}
                onToggleSelect={() => toggleSelect(tx.id)}
                onToggleExpand={() => setExpanded(expanded === tx.id ? null : tx.id)}
                onVerify={() => handleVerify(tx.id)}
                onReject={() => {
                  setRejectingId(tx.id);
                  setRejectReason("");
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={!!rejectingId}
        onClose={() => setRejectingId(null)}
        variant="center"
        title={`Tolak ${rejectingId ?? ""}`}
        subtitle="Reject Bukti"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectingId(null)}>
              Batal
            </Button>
            <Button variant="danger" icon={X} onClick={doReject}>
              Tolak Bukti
            </Button>
          </>
        }
      >
        <Field label="Alasan penolakan" help="Akan dikirim ke pemohon dan tercatat di audit trail.">
          <Textarea
            value={rejectReason}
            onChange={setRejectReason}
            placeholder="Contoh: bukti tidak sesuai nominal yang dilaporkan, mohon koreksi…"
            rows={4}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={bulkVerify}
        title={`Verifikasi ${selected.size} bukti?`}
        message="Semua item yang dipilih akan diverifikasi sekaligus. Saldo kas akan dikurangi sesuai total nominal. Aksi tercatat di audit trail."
        confirmLabel="Verifikasi Semua"
      />
    </div>
  );
}

function VerifRow({
  tx,
  state,
  expanded,
  selected,
  onToggleSelect,
  onToggleExpand,
  onVerify,
  onReject,
}: {
  tx: Transaction;
  state: AppState;
  expanded: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const u = sel.userById(state, tx.requesterId);
  return (
    <div
      style={{
        borderBottom: "1px solid var(--hairline)",
        transition: "background 150ms",
        background: expanded ? "rgba(94,182,250,0.03)" : "",
      }}
    >
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Checkbox checked={selected} onChange={onToggleSelect} />
        <div
          onClick={onToggleExpand}
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer", minWidth: 0 }}
        >
          <Avatar user={u} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tx.description}
            </div>
            <div
              className="mono dim"
              style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}
            >
              {tx.id} · {u?.name} · {u?.divisi} · {fmtRelTime(tx.createdAt)}
              {tx.verbalApproval && (
                <span style={{ color: "#8ed395", marginLeft: 8 }}>
                  · <MessageCircle size={10} style={{ marginRight: 2, verticalAlign: "text-bottom" }} />
                  Approval WA
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              {fmtIDR(tx.amount)}
            </div>
            <Badge category>{tx.category}</Badge>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button variant="danger" size="sm" icon={X} onClick={onReject}>
            Tolak
          </Button>
          <Button variant="success" size="sm" icon={Check} onClick={onVerify}>
            Verifikasi
          </Button>
          <button className="icon-btn" onClick={onToggleExpand} aria-label="Toggle">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "8px 18px 20px 60px", borderTop: "1px solid var(--hairline)" }}>
          <div className="grid-2" style={{ gap: 16 }}>
            <div>
              <div
                className="mono dim"
                style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}
              >
                Deskripsi
              </div>
              <div className="quote">{tx.description}</div>
              <div className="kv" style={{ marginTop: 14 }}>
                {tx.spentDate && (
                  <>
                    <span className="k">Tgl Pengeluaran</span>
                    <span className="v">{fmtDate(tx.spentDate)}</span>
                  </>
                )}
                {tx.verbalApproval && (
                  <>
                    <span className="k">Approval Lisan</span>
                    <span className="v" style={{ fontSize: 13 }}>
                      {tx.verbalApproval}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div
                className="mono dim"
                style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}
              >
                Bukti ({tx.attachments?.length || 0})
              </div>
              {tx.attachments?.length ? (
                <div className="attach-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
                  {tx.attachments.slice(0, 3).map((a) => (
                    <div key={a.id} className="attach-card">
                      <div className={`attach-thumb ${a.imgData ? "has-img" : ""}`} style={{ aspectRatio: "1/1" }}>
                        {a.imgData ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={a.imgData} alt="" />
                        ) : (
                          <FileText size={24} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mono dim" style={{ fontSize: 12 }}>
                  Tidak ada bukti
                </div>
              )}
              <Link
                href={`/transactions/${tx.id}`}
                className="mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  marginTop: 12,
                  color: "var(--brand-sky)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Buka Detail Lengkap <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
