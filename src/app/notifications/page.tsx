"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BellOff, CheckCheck } from "lucide-react";
import { useStore } from "@/store/store";
import { Button, Card, Empty } from "@/components/ui/primitives";
import { fmtRelTime } from "@/lib/format";

export default function NotificationsPage() {
  const { state, actions } = useStore();
  const router = useRouter();
  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="page-subtitle">Inbox</div>
          <h1 className="page-title">Notifikasi</h1>
        </div>
        <Button
          variant="outline"
          icon={CheckCheck}
          onClick={() => actions.markAllNotifsRead()}
          disabled={state.notifications.every((n) => n.read)}
        >
          Tandai semua dibaca
        </Button>
      </div>

      <Card flush>
        {state.notifications.length === 0 ? (
          <Empty icon={BellOff} title="Tidak ada notifikasi" body="Anda sudah up-to-date." />
        ) : (
          state.notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.read ? "" : "unread"}`}
              onClick={() => {
                actions.markNotifRead(n.id);
                if (n.txId) router.push(`/transactions/${n.txId}`);
              }}
              style={{ padding: "14px 20px" }}
            >
              <div style={{ flex: 1 }}>
                <div className="text">{n.text}</div>
                <div className="time">{fmtRelTime(n.time)}</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
