"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/toast";
import {
  Button,
  CurrencyInput,
  Dropzone,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { fmtIDR } from "@/lib/format";

interface FileItem {
  fileName: string;
  imgData: string | null;
  mimeType: string;
  fileSize: number;
}

export function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [description, setDescription] = useState("");
  const [spentDate, setSpentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<FileItem[]>([]);
  const [verbalApproval, setVerbalApproval] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setAmount(null);
      setCategory("");
      setProject("");
      setDescription("");
      setSpentDate(new Date().toISOString().slice(0, 10));
      setFiles([]);
      setVerbalApproval("");
      setErrors({});
    }
  }, [open]);

  const threshold = state.fund.preApprovalThreshold;
  const overThreshold = useMemo(() => (amount || 0) > threshold, [amount, threshold]);

  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!amount || amount <= 0) errs.amount = "Jumlah harus lebih dari 0";
    if (!category) errs.category = "Pilih kategori";
    if (!description.trim()) errs.description = "Deskripsi wajib diisi";
    if (files.length === 0) errs.files = "Unggah minimal satu bukti";
    if (overThreshold && !verbalApproval.trim()) {
      errs.verbalApproval = "Untuk pengeluaran di atas threshold, catatan approval lisan/WA wajib diisi";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const id = await actions.createTransaction({
        amount: amount!,
        category,
        project: project || "(Tanpa Proyek)",
        description: description.trim(),
        spentDate: new Date(spentDate).toISOString(),
        attachments: files,
        verbalApproval: verbalApproval.trim() || null,
      });
      if (id) {
        toast.success("Laporan dikirim", `${id} menunggu verifikasi bukti.`);
        onClose();
      }
    } catch (err) {
      toast.error("Gagal mengirim laporan", String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="wide"
      title="Laporkan Pengeluaran"
      subtitle="Petty Cash · Laporan Pengeluaran"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Mengirim…" : "Kirim Laporan"}
          </Button>
        </>
      }
    >
      <div className="row gap-16" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 240 }}>
          <Field label="Jumlah Pengeluaran" error={errors.amount}>
            <CurrencyInput value={amount} onChange={setAmount} error={!!errors.amount} />
          </Field>
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 200 }}>
          <Field label="Kategori" error={errors.category}>
            <Select
              value={category}
              onChange={setCategory}
              placeholder="Pilih kategori…"
              options={state.categories}
              error={!!errors.category}
            />
          </Field>
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 180 }}>
          <Field label="Tanggal Pengeluaran">
            <Input type="date" value={spentDate} onChange={setSpentDate} />
          </Field>
        </div>
      </div>

      <Field label="Proyek" help="Hubungkan transaksi dengan proyek atau klien. Pilih (Tanpa Proyek) jika tidak ada.">
        <Select
          value={project}
          onChange={setProject}
          placeholder="Pilih proyek…"
          options={state.projects.length ? state.projects : ["(Tanpa Proyek)"]}
        />
      </Field>

      <Field label="Deskripsi" error={errors.description} help="Jelaskan singkat untuk apa pengeluaran ini.">
        <Textarea
          value={description}
          onChange={setDescription}
          placeholder="Contoh: Bensin perjalanan ke kantor klien BIN"
          rows={3}
          error={!!errors.description}
        />
      </Field>

      {overThreshold && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "rgba(217, 165, 90, 0.08)",
            border: "1px solid rgba(217, 165, 90, 0.32)",
            borderRadius: 8,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={16} style={{ color: "#e8b870", flex: "none", marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
              Jumlah di atas threshold pre-approval ({fmtIDR(threshold)})
            </div>
            <div className="mono dim" style={{ fontSize: 11, lineHeight: 1.5 }}>
              Untuk pengeluaran di atas threshold, pastikan sudah mendapat approval lisan / WA dari custodian. Catat referensinya di bawah.
            </div>
          </div>
        </div>
      )}

      <Field
        label={overThreshold ? "Catatan Approval Lisan / WA (Wajib)" : "Catatan Approval Lisan / WA (Opsional)"}
        error={errors.verbalApproval}
        help='Contoh: "Approval WA dari Pak Risman pukul 14:30, 22 Mei"'
      >
        <Input
          value={verbalApproval}
          onChange={setVerbalApproval}
          placeholder="WA approval dari…"
          error={!!errors.verbalApproval}
        />
      </Field>

      <Field
        label="Bukti / Struk (Wajib)"
        error={errors.files}
        help="Bisa upload lebih dari satu file sekaligus. Drag-and-drop atau Ctrl/Cmd+klik untuk pilih banyak."
      >
        <Dropzone onFiles={(f) => setFiles((prev) => [...prev, ...f])} />
        {files.length > 0 && (
          <div className="attach-grid" style={{ marginTop: 12 }}>
            {files.map((f, i) => (
              <div key={i} className="attach-card" style={{ position: "relative" }}>
                <button
                  className="icon-btn"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 24,
                    height: 24,
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 1,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiles((prev) => prev.filter((_, j) => j !== i));
                  }}
                  aria-label="Hapus file"
                >
                  <X size={12} />
                </button>
                <div className={`attach-thumb ${f.imgData ? "has-img" : ""}`}>
                  {f.imgData ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={f.imgData} alt={f.fileName} />
                  ) : (
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em" }}>PDF</span>
                  )}
                </div>
                <div className="attach-meta">
                  <div className="fname" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.fileName}
                  </div>
                  <div className="dim">{(f.fileSize / 1024).toFixed(0)} KB</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Field>
    </Modal>
  );
}

// Global trigger button — convenient way to open the modal from anywhere via ref
import { useContext } from "react";
import { createContext } from "react";

interface NewTxApi {
  open: () => void;
}
const NewTxContext = createContext<NewTxApi | null>(null);

export function NewTransactionProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const api: NewTxApi = { open: () => setOpen(true) };
  return (
    <NewTxContext.Provider value={api}>
      {children}
      <NewTransactionModal open={open} onClose={() => setOpen(false)} />
    </NewTxContext.Provider>
  );
}

export function useNewTx(): NewTxApi {
  const ctx = useContext(NewTxContext);
  if (!ctx) throw new Error("useNewTx must be used within NewTransactionProvider");
  return ctx;
}
