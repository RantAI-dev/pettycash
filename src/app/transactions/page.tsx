"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Copy,
  Download,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { sel, useStore } from "@/store/store";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Menu,
  MenuItem,
  PaginationBar,
  StatusBadge,
} from "@/components/ui/primitives";
import { fmtDate, fmtIDR, STATUS_LABEL } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useNewTx } from "@/components/NewTransactionModal";
import { ExportReportModal } from "@/components/ExportReportModal";
import type { Status } from "@/lib/types";
import {
  PERIOD_PRESETS,
  applyFilters,
  resolveRange,
  type TxFilters,
} from "@/lib/filters";

export default function TransactionsPageWrapper() {
  return (
    <Suspense fallback={<div className="page" />}>
      <TransactionsPage />
    </Suspense>
  );
}

function TransactionsPage() {
  const { state } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const newTx = useNewTx();

  const initialStatus = params.get("status") ? params.get("status")!.split(",") : [];
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [requester, setRequester] = useState("");
  const [period, setPeriod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const filters: TxFilters = useMemo(
    () => ({
      search: search || undefined,
      statuses: statuses.length ? statuses : undefined,
      category: category || undefined,
      project: project || undefined,
      requesterId: requester || undefined,
      period: period || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [search, statuses, category, project, requester, period, dateFrom, dateTo],
  );

  const effectiveRange = useMemo(() => resolveRange(filters), [filters]);

  const PAGE_SIZE = 15;
  const filtered = useMemo(() => applyFilters(state, filters), [state, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reset = () => {
    setSearch("");
    setStatuses([]);
    setCategory("");
    setProject("");
    setRequester("");
    setPeriod("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const toggleStatus = (s: string) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPage(1);
  };

  const hasFilter = !!(search || statuses.length || category || project || requester || period || dateFrom || dateTo);
  const rangeLabel = effectiveRange
    ? `${fmtDate(effectiveRange.from, { short: true })} – ${fmtDate(Math.min(effectiveRange.to, Date.now()), { short: true })}`
    : null;

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="page-subtitle">
            Transaksi · {filtered.length} dari {state.transactions.length} total{rangeLabel ? ` · ${rangeLabel}` : ""}
          </div>
          <h1 className="page-title">Semua Transaksi</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="outline" icon={Download} onClick={() => setExportOpen(true)}>
            Export Laporan
          </Button>
          <Button variant="primary" icon={Plus} onClick={newTx.open}>
            Laporkan Pengeluaran
          </Button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari ID, deskripsi, pemohon…"
          />
        </div>
        <select
          className="select"
          style={{ width: "auto", flex: "0 0 auto" }}
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
        >
          {PERIOD_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: "auto", flex: "0 0 auto" }}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Kategori</option>
          {state.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: "auto", flex: "0 0 auto" }}
          value={project}
          onChange={(e) => {
            setProject(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Proyek</option>
          {(state.projects ?? []).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: "auto", flex: "0 0 auto" }}
          value={requester}
          onChange={(e) => {
            setRequester(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Pemohon</option>
          {state.users.filter((u) => u.active).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <Button variant="ghost" icon={SlidersHorizontal} onClick={() => setFiltersOpen(!filtersOpen)}>
          Status{" "}
          {statuses.length > 0 && (
            <span style={{ background: "var(--brand-sky)", color: "#072036", borderRadius: 99, padding: "0 6px", fontSize: 10, marginLeft: 4 }}>
              {statuses.length}
            </span>
          )}
        </Button>
        {hasFilter ? (
          <Button variant="ghost" icon={X} onClick={reset}>
            Reset
          </Button>
        ) : null}
      </div>

      {filtersOpen && (
        <Card style={{ marginBottom: 16 }} tight>
          <div className="row" style={{ flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 280px" }}>
              <label className="input-label">Status Transaksi</label>
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {(["reported", "verified", "closed", "rejected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    style={{
                      border: `1px solid ${statuses.includes(s) ? "var(--brand-sky)" : "var(--hairline)"}`,
                      background: statuses.includes(s) ? "rgba(94,182,250,0.12)" : "transparent",
                      color: statuses.includes(s) ? "#cfe6fc" : "rgba(255,255,255,0.75)",
                      padding: "5px 12px",
                      borderRadius: 99,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            {period === "custom" && (
              <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
                <div>
                  <label className="input-label">Dari</label>
                  <input
                    className="input"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div>
                  <label className="input-label">Sampai</label>
                  <input
                    className="input"
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {hasFilter && (
        <div className="row" style={{ marginBottom: 12, gap: 6, flexWrap: "wrap" }}>
          {period && period !== "custom" && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                padding: "4px 10px",
                background: "rgba(94,182,250,0.08)",
                border: "1px solid rgba(94,182,250,0.2)",
                borderRadius: 99,
                color: "#cfe6fc",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Calendar size={10} />
              {PERIOD_PRESETS.find((p) => p.value === period)?.label}
              <button onClick={() => setPeriod("")} style={{ display: "inline-flex", marginLeft: 2 }}>
                <X size={10} />
              </button>
            </span>
          )}
          {statuses.map((s) => (
            <span
              key={s}
              className="mono"
              style={{
                fontSize: 10,
                padding: "4px 10px",
                background: "rgba(94,182,250,0.08)",
                border: "1px solid rgba(94,182,250,0.2)",
                borderRadius: 99,
                color: "#cfe6fc",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {STATUS_LABEL[s]}
              <button onClick={() => toggleStatus(s)} style={{ display: "inline-flex", marginLeft: 2 }}>
                <X size={10} />
              </button>
            </span>
          ))}
          {category && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                padding: "4px 10px",
                background: "rgba(94,182,250,0.08)",
                border: "1px solid rgba(94,182,250,0.2)",
                borderRadius: 99,
                color: "#cfe6fc",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {category}
              <button onClick={() => setCategory("")} style={{ display: "inline-flex", marginLeft: 2 }}>
                <X size={10} />
              </button>
            </span>
          )}
          {project && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                padding: "4px 10px",
                background: "rgba(94,182,250,0.08)",
                border: "1px solid rgba(94,182,250,0.2)",
                borderRadius: 99,
                color: "#cfe6fc",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Proyek: {project}
              <button onClick={() => setProject("")} style={{ display: "inline-flex", marginLeft: 2 }}>
                <X size={10} />
              </button>
            </span>
          )}
          {requester && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                padding: "4px 10px",
                background: "rgba(94,182,250,0.08)",
                border: "1px solid rgba(94,182,250,0.2)",
                borderRadius: 99,
                color: "#cfe6fc",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {sel.userById(state, requester)?.name?.split(" ").slice(0, 2).join(" ")}
              <button onClick={() => setRequester("")} style={{ display: "inline-flex", marginLeft: 2 }}>
                <X size={10} />
              </button>
            </span>
          )}
        </div>
      )}

      <Card flush>
        {filtered.length === 0 ? (
          <div style={{ padding: 24 }}>
            <Empty
              title="Tidak ada transaksi yang cocok"
              body="Coba ubah filter atau laporkan pengeluaran baru."
              action={
                <Button variant="primary" icon={Plus} onClick={newTx.open}>
                  Laporkan Pengeluaran
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>ID</th>
                    <th style={{ width: 110 }}>Tanggal</th>
                    <th>Pemohon</th>
                    <th>Proyek</th>
                    <th>Deskripsi</th>
                    <th>Kategori</th>
                    <th className="num" style={{ width: 130 }}>
                      Jumlah
                    </th>
                    <th>Status</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((tx) => {
                    const u = sel.userById(state, tx.requesterId);
                    return (
                      <tr key={tx.id} onClick={() => router.push(`/transactions/${tx.id}`)}>
                        <td className="id-cell">
                          {tx.id}
                          {tx.verbalApproval && (
                            <MessageCircle
                              size={11}
                              style={{ marginLeft: 6, color: "#8ed395", verticalAlign: "middle" }}
                            />
                          )}
                        </td>
                        <td className="mono dim" style={{ whiteSpace: "nowrap" }}>
                          {fmtDate(tx.createdAt, { short: true })}
                        </td>
                        <td>
                          <span className="avatar-row">
                            <Avatar user={u} size="sm" />
                            <span className="name">{u?.name}</span>
                          </span>
                        </td>
                        <td>
                          <Badge custom="cat">{tx.project ?? "(Tanpa Proyek)"}</Badge>
                        </td>
                        <td className="ellip">{tx.description}</td>
                        <td>
                          <Badge category>{tx.category}</Badge>
                        </td>
                        <td className="num">{fmtIDR(tx.amount)}</td>
                        <td>
                          <StatusBadge status={tx.status as Status} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Menu
                            trigger={
                              <button className="icon-btn" style={{ width: 28, height: 28 }}>
                                <MoreHorizontal size={14} />
                              </button>
                            }
                          >
                            <MenuItem icon={Eye} onClick={() => router.push(`/transactions/${tx.id}`)}>
                              Lihat detail
                            </MenuItem>
                            <MenuItem
                              icon={Copy}
                              onClick={() => {
                                navigator.clipboard?.writeText(tx.id);
                                toast.info("Disalin", tx.id);
                              }}
                            >
                              Salin ID
                            </MenuItem>
                          </Menu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              total={filtered.length}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </Card>

      <ExportReportModal open={exportOpen} onClose={() => setExportOpen(false)} initialFilters={filters} />
    </div>
  );
}
