"use client";

import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/toast";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui/primitives";
import type { Transaction } from "@/lib/types";

/**
 * Edits non-financial transaction fields: PIC, project, category, description,
 * spent date, verbal-approval note. Amount + status + attachments stay locked.
 * Every save appends an `edited_draft` event to the transaction's Riwayat.
 */
export function EditTransactionDialog({
  tx,
  onClose,
}: {
  tx: Transaction | null;
  onClose: () => void;
}) {
  const { state, actions } = useStore();
  const toast = useToast();

  const [pic, setPic] = useState("");
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [spentDate, setSpentDate] = useState("");
  const [verbalApproval, setVerbalApproval] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setPic(tx.pic ?? "");
    setProject(tx.project);
    setCategory(tx.category);
    setDescription(tx.description);
    setSpentDate(tx.spentDate ? tx.spentDate.slice(0, 10) : "");
    setVerbalApproval(tx.verbalApproval ?? "");
  }, [tx]);

  if (!tx) return null;

  const submit = async () => {
    if (!description.trim()) {
      toast.error("Deskripsi tidak boleh kosong");
      return;
    }
    if (!category) {
      toast.error("Kategori harus dipilih");
      return;
    }
    setBusy(true);
    try {
      await actions.editTransaction(tx.id, {
        pic: pic.trim() || null,
        project: project || "(Tanpa Proyek)",
        category,
        description: description.trim(),
        spentDate: spentDate ? new Date(spentDate).toISOString() : undefined,
        verbalApproval: verbalApproval.trim() || null,
      });
      toast.success("Transaksi diperbarui", `Perubahan tercatat di Riwayat ${tx.id}.`);
      onClose();
    } catch (err) {
      toast.error("Gagal menyimpan", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!tx}
      onClose={onClose}
      variant="center"
      width="wide"
      subtitle={`${tx.id} · Edit fields non-finansial`}
      title="Edit Transaksi"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" icon={Save} onClick={submit} disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
        </>
      }
    >
      <div
        className="mono dim"
        style={{
          padding: "10px 12px",
          background: "rgba(94,182,250,0.04)",
          border: "1px solid var(--hairline)",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 11,
          lineHeight: 1.5,
          textTransform: "none",
          letterSpacing: 0,
        }}
      >
        Jumlah, bukti, pemohon, dan status tidak bisa diubah dari sini (kalau ada yang salah,
        tolak transaksi dan biarkan pemohon submit ulang). Perubahan dari form ini tercatat
        di Riwayat sebagai event <code>edited_draft</code>.
      </div>

      <div className="row gap-16" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 220 }}>
          <Field label="Proyek">
            <Select
              value={project}
              onChange={setProject}
              options={state.projects.length ? state.projects : ["(Tanpa Proyek)"]}
            />
          </Field>
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 220 }}>
          <Field label="PIC / Penanggung Jawab">
            <Input value={pic} onChange={setPic} placeholder="Contoh: Pak Risman" />
          </Field>
        </div>
      </div>

      <div className="row gap-16" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 220 }}>
          <Field label="Kategori">
            <Select value={category} onChange={setCategory} options={state.categories} />
          </Field>
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 200 }}>
          <Field label="Tanggal Pengeluaran">
            <Input type="date" value={spentDate} onChange={setSpentDate} />
          </Field>
        </div>
      </div>

      <Field label="Deskripsi">
        <Textarea value={description} onChange={setDescription} rows={3} />
      </Field>

      <Field label="Catatan Approval Lisan / WA (Opsional)">
        <Input value={verbalApproval} onChange={setVerbalApproval} placeholder="WA approval dari…" />
      </Field>
    </Modal>
  );
}
