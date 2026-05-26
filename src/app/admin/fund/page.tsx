"use client";

import React, { useEffect, useState } from "react";
import { CircleDot, Lock, Plus, Save, X } from "lucide-react";
import { can, useStore } from "@/store/store";
import {
  Button,
  Card,
  Checkbox,
  CurrencyInput,
  Empty,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export default function AdminFundPage() {
  const { state, currentUser, actions } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState(state.fund);
  const [draftCats, setDraftCats] = useState(state.categories);
  const [draftProjects, setDraftProjects] = useState(state.projects);
  const [draftNotifs, setDraftNotifs] = useState(state.notifSettings);
  const [newCat, setNewCat] = useState("");
  const [newProject, setNewProject] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(state.fund);
    setDraftCats(state.categories);
    setDraftProjects(state.projects);
    setDraftNotifs(state.notifSettings);
    setDirty(false);
  }, [state.fund, state.categories, state.projects, state.notifSettings]);

  const markDirty = () => setDirty(true);

  if (!can.manageFund(currentUser)) {
    return (
      <div className="page">
        <Empty icon={Lock} title="Akses Ditolak" />
      </div>
    );
  }

  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    // Hit all four endpoints in parallel and only refresh once at the end.
    // Doing it via the store actions used to trigger a refresh after every
    // single PATCH/PUT, which made the useEffect reset the drafts mid-save
    // and the save bar disappear before the user knew if anything happened.
    const requests: Array<Promise<Response>> = [
      fetch("/api/fund", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      }),
      fetch("/api/categories", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categories: draftCats }),
      }),
      fetch("/api/projects", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projects: draftProjects }),
      }),
      fetch("/api/notif-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftNotifs),
      }),
    ];
    try {
      const responses = await Promise.all(requests);
      const failed: string[] = [];
      const names = ["Fund", "Kategori", "Proyek", "Notifikasi"];
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const body = await responses[i].text().catch(() => "");
          failed.push(`${names[i]} (${responses[i].status}): ${body || "tanpa detail"}`);
        }
      }
      if (failed.length) {
        toast.error("Sebagian gagal disimpan", failed.join(" · "));
      } else {
        toast.success("Pengaturan disimpan", "Perubahan berlaku sekarang");
      }
      await actions.refresh();
      setDirty(false);
    } catch (err) {
      toast.error("Gagal menyimpan", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      <div style={{ marginBottom: 24 }}>
        <div className="page-subtitle">Admin · Pengaturan</div>
        <h1 className="page-title">Pengaturan Petty Cash Fund</h1>
      </div>

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        <Card header="Detail Fund">
          <Field label="Nama Fund">
            <Input
              value={draft.name}
              onChange={(v) => {
                setDraft({ ...draft, name: v });
                markDirty();
              }}
            />
          </Field>
          <Field label="Custodian Aktif" help="Hanya 1 custodian aktif pada satu waktu">
            <Select
              value={draft.custodianId}
              options={state.users
                .filter((u) => u.role === "custodian" || u.role === "super_admin")
                .map((u) => ({ value: u.id, label: u.name }))}
              onChange={(v) => {
                setDraft({ ...draft, custodianId: v });
                markDirty();
              }}
            />
          </Field>
          <Field label="Plafon (Ceiling)" help="Saldo maksimum yang bisa dipegang">
            <CurrencyInput
              value={draft.ceiling}
              onChange={(v) => {
                setDraft({ ...draft, ceiling: v || 0 });
                markDirty();
              }}
            />
          </Field>
          <Field label="SLA Upload Bukti (jam)" help="Batas waktu requester mengupload bukti setelah disbursement">
            <Input
              type="number"
              value={String(draft.buktiSlaHours)}
              onChange={(v) => {
                setDraft({ ...draft, buktiSlaHours: Number(v) || 0 });
                markDirty();
              }}
            />
          </Field>
        </Card>

        <div className="col" style={{ gap: 16 }}>
          <Card
            header="Kategori Transaksi"
            headerActions={
              <span className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {draftCats.length} kategori
              </span>
            }
          >
            <div className="row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {draftCats.map((c) => (
                <span
                  key={c}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--hairline)",
                    fontSize: 12,
                  }}
                >
                  {c}
                  <button
                    onClick={() => {
                      setDraftCats(draftCats.filter((x) => x !== c));
                      markDirty();
                    }}
                    aria-label="Hapus"
                    style={{ display: "inline-flex" }}
                  >
                    <X size={11} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </span>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Input value={newCat} onChange={setNewCat} placeholder="Tambah kategori baru…" />
              <Button
                variant="outline"
                icon={Plus}
                onClick={() => {
                  if (newCat.trim() && !draftCats.includes(newCat.trim())) {
                    setDraftCats([...draftCats, newCat.trim()]);
                    setNewCat("");
                    markDirty();
                  }
                }}
              >
                Tambah
              </Button>
            </div>
          </Card>

          <Card
            header="Proyek / Klien"
            headerActions={
              <span className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {draftProjects.length} proyek
              </span>
            }
          >
            <p
              className="mono dim"
              style={{
                fontSize: 11,
                lineHeight: 1.6,
                marginBottom: 12,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Daftar ini muncul sebagai dropdown saat user membuat laporan pengeluaran. Tambahkan
              klien / proyek internal, dan biarkan <code>(Tanpa Proyek)</code> sebagai fallback
              untuk transaksi yang tidak terikat ke proyek tertentu.
            </p>
            <div className="row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {draftProjects.length === 0 && (
                <span className="mono dim" style={{ fontSize: 11 }}>
                  Belum ada proyek. Tambahkan minimal satu (mis. <code>(Tanpa Proyek)</code>).
                </span>
              )}
              {draftProjects.map((p) => (
                <span
                  key={p}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 99,
                    background: "rgba(94, 182, 250, 0.08)",
                    border: "1px solid rgba(94, 182, 250, 0.24)",
                    fontSize: 12,
                    color: "#cfe6fc",
                  }}
                >
                  {p}
                  <button
                    onClick={() => {
                      setDraftProjects(draftProjects.filter((x) => x !== p));
                      markDirty();
                    }}
                    aria-label="Hapus proyek"
                    style={{ display: "inline-flex" }}
                  >
                    <X size={11} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </span>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Input
                value={newProject}
                onChange={setNewProject}
                placeholder="Tambah proyek baru… mis. Klien Kominfo"
              />
              <Button
                variant="outline"
                icon={Plus}
                onClick={() => {
                  const v = newProject.trim();
                  if (v && !draftProjects.includes(v)) {
                    setDraftProjects([...draftProjects, v]);
                    setNewProject("");
                    markDirty();
                  }
                }}
              >
                Tambah
              </Button>
            </div>
          </Card>

          <Card header="Notifikasi Email">
            <div className="col" style={{ gap: 10 }}>
              <Checkbox
                checked={draftNotifs.onApproved}
                onChange={(v) => {
                  setDraftNotifs({ ...draftNotifs, onApproved: v });
                  markDirty();
                }}
                label="Saat pengajuan disetujui"
              />
              <Checkbox
                checked={draftNotifs.onRejected}
                onChange={(v) => {
                  setDraftNotifs({ ...draftNotifs, onRejected: v });
                  markDirty();
                }}
                label="Saat pengajuan ditolak"
              />
              <Checkbox
                checked={draftNotifs.onBuktiMissing}
                onChange={(v) => {
                  setDraftNotifs({ ...draftNotifs, onBuktiMissing: v });
                  markDirty();
                }}
                label="Saat bukti belum diupload (reminder)"
              />
              <Checkbox
                checked={draftNotifs.onTopUpApproved}
                onChange={(v) => {
                  setDraftNotifs({ ...draftNotifs, onTopUpApproved: v });
                  markDirty();
                }}
                label="Saat top-up disetujui"
              />
              <Checkbox
                checked={draftNotifs.onNoteAdded}
                onChange={(v) => {
                  setDraftNotifs({ ...draftNotifs, onNoteAdded: v });
                  markDirty();
                }}
                label="Saat ada catatan baru di transaksi saya"
              />
            </div>
          </Card>
        </div>
      </div>

      {dirty && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: state.sidebarCollapsed ? 72 : 240,
            right: 0,
            padding: "12px 24px",
            background: "var(--surface-2)",
            borderTop: "1px solid var(--hairline-strong)",
            zIndex: 25,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            boxShadow: "0 -8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 12, color: "var(--muted-foreground)", alignSelf: "center", marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <CircleDot size={11} style={{ color: "#d8a07a" }} />
            Ada perubahan belum disimpan
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(state.fund);
              setDraftCats(state.categories);
              setDraftNotifs(state.notifSettings);
              setDirty(false);
            }}
          >
            Buang Perubahan
          </Button>
          <Button variant="primary" icon={Save} onClick={save} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
        </div>
      )}
    </div>
  );
}
