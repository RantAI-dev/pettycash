"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Lock,
  MessageCircle,
  MessageSquarePlus,
  Paperclip,
  Plus,
  SearchX,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { can, sel, useStore } from "@/store/store";
import {
  AttachmentCard,
  Avatar,
  AvatarRow,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dropzone,
  Empty,
  Field,
  Lightbox,
  Modal,
  StatusBadge,
  Textarea,
} from "@/components/ui/primitives";
import { Timeline } from "@/components/Timeline";
import { fmtDate, fmtDateTime, fmtIDR, fmtRelTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

interface ConfirmAction {
  type: string;
  label: string;
  msg: string;
  fn: () => void;
}

export default function TransactionDetailPage() {
  const { state, currentUser, actions } = useStore();
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const txId = params.id;
  const tx = sel.txById(state, txId);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  if (!tx) {
    return (
      <div className="page">
        <Empty
          icon={SearchX}
          title="Transaksi tidak ditemukan"
          body={`ID ${txId} tidak ada di sistem.`}
          action={
            <Button variant="outline" as="link" href="/transactions">
              Kembali ke Transaksi
            </Button>
          }
        />
      </div>
    );
  }

  const requester = sel.userById(state, tx.requesterId);
  const custodian = sel.userById(state, tx.custodianId);
  const isMine = tx.requesterId === currentUser.id;

  const showVerifyReject = tx.status === "reported" && can.verify(currentUser);
  const showUploadBukti =
    (tx.status === "reported" || tx.status === "rejected") && (isMine || can.verify(currentUser));
  const showClose = tx.status === "verified" && can.closeTx(currentUser);

  const doVerify = () => {
    actions.verifyTransaction(tx.id);
    toast.success("Diverifikasi", `Bukti ${tx.id} sudah diverifikasi`);
  };
  const doReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Alasan diperlukan", "Mohon jelaskan alasan penolakan");
      return;
    }
    actions.rejectTransaction(tx.id, rejectReason.trim());
    toast.info("Ditolak", `${tx.id} ditolak`);
    setRejectOpen(false);
    setRejectReason("");
  };
  const doClose = () => {
    actions.closeTransaction(tx.id);
    toast.success("Selesai", `${tx.id} ditutup`);
  };
  const doAddNote = () => {
    if (!noteText.trim()) return;
    actions.addNote(tx.id, noteText.trim());
    toast.info("Catatan ditambahkan");
    setNoteText("");
  };

  const handleBuktiFiles = (
    files: Array<{ fileName: string; imgData: string | null; mimeType: string; fileSize: number }>,
  ) => {
    actions.uploadBukti(tx.id, files);
    toast.success("Bukti diupload", `${files.length} file berhasil ditambahkan`);
    setUploadOpen(false);
  };

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <Link href="/transactions" className="icon-btn" style={{ marginTop: 4 }} aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <div className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 12, letterSpacing: 0 }}>
              {tx.id}
            </span>
            <Badge category>{tx.category}</Badge>
            {tx.verbalApproval && (
              <Badge custom="cat">
                <MessageCircle size={10} style={{ marginRight: 4 }} />
                Approval WA
              </Badge>
            )}
            <StatusBadge status={tx.status} />
          </div>
          <h1 className="page-title" style={{ margin: "4px 0 0", textWrap: "balance" }}>
            {tx.description}
          </h1>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {showVerifyReject && (
            <>
              <Button variant="danger" icon={X} onClick={() => setRejectOpen(true)}>
                Tolak Bukti
              </Button>
              <Button
                variant="success"
                icon={Check}
                onClick={() =>
                  setConfirmAction({
                    type: "verify",
                    label: "Verifikasi bukti",
                    fn: doVerify,
                    msg: `Apakah bukti dan deskripsi sudah sesuai? Setelah diverifikasi, saldo kas akan dikurangi ${fmtIDR(tx.amount)}.`,
                  })
                }
              >
                Verifikasi Bukti
              </Button>
            </>
          )}
          {showUploadBukti && (
            <Button
              variant={tx.status === "rejected" ? "primary" : "outline"}
              icon={Upload}
              onClick={() => setUploadOpen(true)}
            >
              {tx.status === "rejected" ? "Upload Ulang Bukti" : "Tambah Bukti"}
            </Button>
          )}
          {showClose && (
            <Button
              variant="outline"
              icon={Lock}
              onClick={() =>
                setConfirmAction({
                  type: "close",
                  label: "Tutup transaksi",
                  fn: doClose,
                  msg: "Setelah ditutup, transaksi terkunci dan tidak bisa diedit. Hanya catatan yang masih bisa ditambahkan.",
                })
              }
            >
              Tutup Transaksi
            </Button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div
                  className="mono dim"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}
                >
                  Jumlah
                </div>
                <div className="hero-amount">{fmtIDR(tx.amount)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="kv">
                  <span className="k">Pemohon</span>
                  <span className="v">
                    <AvatarRow user={requester} withDivisi />
                  </span>
                  <span className="k">Custodian</span>
                  <span className="v">
                    <AvatarRow user={custodian} withRole />
                  </span>
                  <span className="k">Proyek</span>
                  <span className="v">
                    <Badge custom="cat">{tx.project ?? "(Tanpa Proyek)"}</Badge>
                  </span>
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
                        <MessageCircle size={12} style={{ color: "#8ed395", marginRight: 6, verticalAlign: "text-bottom" }} />
                        {tx.verbalApproval}
                      </span>
                    </>
                  )}
                  <span className="k">Dibuat</span>
                  <span className="v mono" style={{ fontSize: 12 }}>
                    {fmtDateTime(tx.createdAt)}
                  </span>
                  {tx.verifiedAt && (
                    <>
                      <span className="k">Diverifikasi</span>
                      <span className="v mono" style={{ fontSize: 12 }}>
                        {fmtDateTime(tx.verifiedAt)}
                      </span>
                    </>
                  )}
                  {tx.closedAt && (
                    <>
                      <span className="k">Ditutup</span>
                      <span className="v mono" style={{ fontSize: 12 }}>
                        {fmtDateTime(tx.closedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card header="Deskripsi">
            <div className="quote" style={{ marginTop: 4 }}>
              {tx.description}
            </div>
          </Card>

          <Card
            flush
            header={`Lampiran${tx.attachments?.length ? ` · ${tx.attachments.length} file` : ""}`}
            headerActions={
              showUploadBukti && (
                <Button variant="ghost" size="sm" icon={Plus} onClick={() => setUploadOpen(true)}>
                  Tambah Bukti
                </Button>
              )
            }
          >
            <div style={{ padding: 20 }}>
              {!tx.attachments || tx.attachments.length === 0 ? (
                <Empty
                  icon={Paperclip}
                  title="Belum ada bukti"
                  body="Upload struk atau nota untuk dapat diverifikasi."
                  action={
                    showUploadBukti ? (
                      <Button variant="primary" icon={Upload} onClick={() => setUploadOpen(true)}>
                        Upload Bukti
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <div className="attach-grid">
                  {tx.attachments.map((att) => {
                    const uploader = sel.userById(state, att.uploadedBy);
                    return (
                      <AttachmentCard
                        key={att.id}
                        att={att}
                        uploaderName={`${uploader?.name?.split(" ")[0]} · ${fmtRelTime(att.uploadedAt)}`}
                        onClick={() => att.imgData && setLightboxSrc(att.imgData)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card
            header="Tambah Catatan"
            headerActions={
              <span
                className="mono dim"
                style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em" }}
              >
                Akan tercatat di Riwayat
              </span>
            }
          >
            <Textarea
              value={noteText}
              onChange={setNoteText}
              placeholder="Tulis catatan, klarifikasi, atau follow-up untuk transaksi ini…"
              rows={3}
            />
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
              <Button variant="primary" size="sm" icon={MessageSquarePlus} onClick={doAddNote} disabled={!noteText.trim()}>
                Kirim Catatan
              </Button>
            </div>
          </Card>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <Card
            header="Riwayat"
            headerActions={
              <span
                className="mono dim"
                style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em" }}
              >
                {tx.events.length} events
              </span>
            }
          >
            <Timeline events={tx.events} state={state} />
          </Card>

          <div
            className="mono dim"
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ShieldCheck size={12} /> Audit trail bersifat append-only dan tidak bisa diedit.
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.fn?.()}
        title={confirmAction?.label || ""}
        message={confirmAction?.msg || ""}
        confirmLabel={confirmAction?.label || ""}
      />

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        variant="center"
        title={`Tolak ${tx.id}`}
        subtitle="Reject Pengajuan"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" icon={X} onClick={doReject}>
              Tolak Pengajuan
            </Button>
          </>
        }
      >
        <Field label="Alasan penolakan" help="Akan dikirim ke pemohon dan tercatat permanen di audit trail.">
          <Textarea
            value={rejectReason}
            onChange={setRejectReason}
            placeholder="Jelaskan kenapa pengajuan ini ditolak…"
            rows={4}
          />
        </Field>
      </Modal>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        variant="center"
        title="Upload Bukti"
        subtitle={`${tx.id} · bisa lebih dari satu file`}
        footer={
          <Button variant="ghost" onClick={() => setUploadOpen(false)}>
            Tutup
          </Button>
        }
      >
        <Dropzone onFiles={handleBuktiFiles} />
      </Modal>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
