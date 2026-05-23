"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Lock, X } from "lucide-react";
import { can, sel, useStore } from "@/store/store";
import { AvatarRow, Button, Card, Empty } from "@/components/ui/primitives";
import { EVENT_COLOR, EVENT_TEMPLATES, fmtDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

export default function AdminAuditPage() {
  const { state, currentUser } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [userFilter, setUserFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [txFilter, setTxFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  if (!can.viewAudit(currentUser)) {
    return (
      <div className="page">
        <Empty icon={Lock} title="Akses Ditolak" />
      </div>
    );
  }

  const all = sel.allEvents(state);
  const filtered = all.filter((ev) => {
    if (userFilter && ev.actorId !== userFilter) return false;
    if (typeFilter && ev.eventType !== typeFilter) return false;
    if (txFilter && !ev.transactionId.toLowerCase().includes(txFilter.toLowerCase())) return false;
    if (dateFrom && ev.createdAt < new Date(dateFrom).getTime()) return false;
    if (dateTo && ev.createdAt > new Date(dateTo).getTime() + 86400000) return false;
    return true;
  });

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-subtitle">Admin · System Audit Log</div>
          <h1 className="page-title">Audit Log</h1>
        </div>
        <Button variant="outline" icon={Download} onClick={() => toast.success("Export dimulai", "CSV akan diunduh")}>
          Export CSV
        </Button>
      </div>

      <div className="filter-bar">
        <input
          className="input"
          placeholder="Cari ID transaksi…"
          value={txFilter}
          onChange={(e) => setTxFilter(e.target.value)}
          style={{ flex: "1 1 180px" }}
        />
        <select
          className="select"
          style={{ width: "auto" }}
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        >
          <option value="">Semua User</option>
          {state.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: "auto" }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Semua Event</option>
          {Object.keys(EVENT_TEMPLATES).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          style={{ width: "auto" }}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="input"
          style={{ width: "auto" }}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        {(userFilter || typeFilter || txFilter || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            icon={X}
            onClick={() => {
              setUserFilter("");
              setTypeFilter("");
              setTxFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <Card flush header={`${filtered.length} events`}>
        <div className="tbl-wrap" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Timestamp</th>
                <th style={{ width: 130 }}>Transaction</th>
                <th>Actor</th>
                <th>Event</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((ev) => {
                const actor = sel.userById(state, ev.actorId);
                const color = EVENT_COLOR[ev.eventType];
                const payload = ev.payload as { reason?: string; note?: string };
                return (
                  <tr key={ev.id} onClick={() => router.push(`/transactions/${ev.transactionId}`)}>
                    <td className="mono dim" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {fmtDateTime(ev.createdAt)}
                    </td>
                    <td className="id-cell">{ev.transactionId}</td>
                    <td>
                      <AvatarRow user={actor} />
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color:
                            color === "red"
                              ? "#e08a8c"
                              : color === "green"
                                ? "#8ed395"
                                : "rgba(255,255,255,0.85)",
                        }}
                      >
                        {ev.eventType}
                      </span>
                    </td>
                    <td className="ellip" style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                      {payload?.reason && <>“{payload.reason}”</>}
                      {payload?.note && !payload.reason && <>{payload.note}</>}
                      {!payload?.reason && !payload?.note && <span className="dim">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div
              style={{ padding: 14, textAlign: "center", borderTop: "1px solid var(--hairline)" }}
              className="mono dim"
            >
              Menampilkan 200 dari {filtered.length} events — gunakan filter untuk mempersempit
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
