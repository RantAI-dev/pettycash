"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { sel, useStore } from "@/store/store";
import { Avatar, Badge, Button, Card, Field, Input, Switch } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { EVENT_COLOR, EVENT_TEMPLATES, fmtDateTime, fmtIDR, fmtRelTime } from "@/lib/format";

export default function ProfilePage() {
  const { state, currentUser, actions } = useStore();

  const myEvents = sel.allEvents(state).filter((ev) => ev.actorId === currentUser.id).slice(0, 20);
  const myTxs = sel.myTransactions(state, currentUser.id);
  const totalSpent = myTxs
    .filter((t) => t.verifiedAt && t.status !== "rejected")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div className="page-subtitle">Akun</div>
        <h1 className="page-title">Profil</h1>
      </div>

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="row" style={{ gap: 18 }}>
              <Avatar user={currentUser} size="xl" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 2 }}>{currentUser.name}</div>
                <div className="mono dim" style={{ fontSize: 12 }}>
                  {currentUser.email}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <Badge custom="cat">{currentUser.role.replace("_", " ")}</Badge>
                  <Badge custom="cat">{currentUser.divisi}</Badge>
                </div>
              </div>
            </div>
          </Card>

          <ChangePasswordCard />

          <Card header="Preferensi Notifikasi">
            <div className="col" style={{ gap: 12 }}>
              <Switch
                checked={state.notifSettings.onApproved}
                onChange={(v) => actions.setNotifSettings({ onApproved: v })}
                label="Email saat pengajuan saya disetujui"
              />
              <Switch
                checked={state.notifSettings.onRejected}
                onChange={(v) => actions.setNotifSettings({ onRejected: v })}
                label="Email saat pengajuan saya ditolak"
              />
              <Switch
                checked={state.notifSettings.onBuktiMissing}
                onChange={(v) => actions.setNotifSettings({ onBuktiMissing: v })}
                label="Reminder bukti belum diupload"
              />
              <Switch
                checked={state.notifSettings.onNoteAdded}
                onChange={(v) => actions.setNotifSettings({ onNoteAdded: v })}
                label="Notifikasi catatan baru"
              />
            </div>
          </Card>

          <Card>
            <div className="grid-3" style={{ gap: 12 }}>
              <div>
                <div className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                  Total Transaksi
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>{myTxs.length}</div>
              </div>
              <div>
                <div className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                  Total Pengeluaran
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>{fmtIDR(totalSpent)}</div>
              </div>
              <div>
                <div className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                  Ditolak / Revisi
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, marginTop: 4, color: "var(--brand-sky)" }}>
                  {myTxs.filter((t) => t.status === "rejected").length}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card header="Aktivitas Terbaru">
          {myEvents.length === 0 ? (
            <div className="mono dim" style={{ fontSize: 12 }}>
              Belum ada aktivitas tercatat.
            </div>
          ) : (
            <div className="timeline" style={{ marginTop: 4 }}>
              {myEvents.map((ev) => {
                const color = EVENT_COLOR[ev.eventType] || "gray";
                const tpl = EVENT_TEMPLATES[ev.eventType];
                const text = tpl ? tpl(currentUser) : ev.eventType;
                return (
                  <div key={ev.id} className={`tl-event ${color}`}>
                    <div className="tl-actor">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>
                          {text} ·{" "}
                          <Link
                            href={`/transactions/${ev.transactionId}`}
                            className="mono"
                            style={{ fontSize: 12, color: "var(--brand-sky)" }}
                          >
                            {ev.transactionId}
                          </Link>
                        </div>
                        <div className="tl-time" title={fmtDateTime(ev.createdAt)}>
                          {fmtRelTime(ev.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const { actions } = useStore();
  const toast = useToast();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!currentPw || !newPw) {
      toast.error("Password lama dan baru wajib diisi");
      return;
    }
    if (newPw.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPw === currentPw) {
      toast.error("Password baru harus berbeda dari yang lama");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setBusy(true);
    try {
      await actions.changeMyPassword(currentPw, newPw);
      toast.success("Password berhasil diubah", "Gunakan password baru saat login berikutnya.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error("Gagal ubah password", err instanceof Error ? err.message.replace(/^\d+\s+\w+:\s*/, "") : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card header="Ubah Password">
      <Field label="Password Lama">
        <div style={{ position: "relative" }}>
          <Input
            value={currentPw}
            onChange={setCurrentPw}
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ paddingRight: 38 }}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="icon-btn"
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 30, height: 30 }}
            aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </Field>
      <Field label="Password Baru" help="Minimal 6 karakter.">
        <Input
          value={newPw}
          onChange={setNewPw}
          type={showPw ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </Field>
      <Field label="Konfirmasi Password Baru">
        <Input
          value={confirmPw}
          onChange={setConfirmPw}
          type={showPw ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </Field>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
        <Button variant="primary" icon={busy ? Loader2 : KeyRound} onClick={submit} disabled={busy}>
          {busy ? "Memproses…" : "Ubah Password"}
        </Button>
      </div>
    </Card>
  );
}
