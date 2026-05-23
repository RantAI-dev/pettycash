"use client";

import React from "react";
import Link from "next/link";
import { sel, useStore } from "@/store/store";
import { Avatar, Badge, Card, Switch } from "@/components/ui/primitives";
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
