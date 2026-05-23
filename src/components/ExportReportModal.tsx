"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Receipt,
  Wallet,
  X,
} from "lucide-react";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/toast";
import { Button, Modal, Switch } from "@/components/ui/primitives";
import {
  PERIOD_PRESETS,
  applyFilters,
  filtersToSearchParams,
  resolveRange,
  type TxFilters,
} from "@/lib/filters";
import { fmtDate, fmtIDR, STATUS_LABEL } from "@/lib/format";

type Mode = "petty" | "transactions";
type Format = "pdf" | "xlsx";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional seed filters from the calling page. Modal copies these into
   *  local state on open, then becomes the source of truth. */
  initialFilters?: TxFilters;
  initialMode?: Mode;
  initialFormat?: Format;
}

export function ExportReportModal({
  open,
  onClose,
  initialFilters,
  initialMode = "petty",
  initialFormat = "pdf",
}: Props) {
  const { state } = useStore();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [format, setFormat] = useState<Format>(initialFormat);
  const [includeBukti, setIncludeBukti] = useState(true);

  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [requester, setRequester] = useState("");
  const [period, setPeriod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Reset / hydrate when modal opens
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setFormat(initialFormat);
    setIncludeBukti(true);
    setSearch(initialFilters?.search ?? "");
    setStatuses(initialFilters?.statuses ?? []);
    setCategory(initialFilters?.category ?? "");
    setProject(initialFilters?.project ?? "");
    setRequester(initialFilters?.requesterId ?? "");
    setPeriod(initialFilters?.period ?? "");
    setDateFrom(initialFilters?.dateFrom ?? "");
    setDateTo(initialFilters?.dateTo ?? "");
  }, [open, initialFilters, initialMode, initialFormat]);

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

  const range = useMemo(() => resolveRange(filters), [filters]);
  const filtered = useMemo(() => applyFilters(state, filters), [state, filters]);
  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const buktiCount = useMemo(
    () => filtered.reduce((s, t) => s + (t.attachments?.length ?? 0), 0),
    [filtered],
  );
  const txWithBukti = useMemo(() => filtered.filter((t) => (t.attachments?.length ?? 0) > 0).length, [filtered]);

  const reset = () => {
    setSearch("");
    setStatuses([]);
    setCategory("");
    setProject("");
    setRequester("");
    setPeriod("");
    setDateFrom("");
    setDateTo("");
  };

  const toggleStatus = (s: string) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleDownload = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada transaksi", "Sesuaikan filter — saat ini kosong.");
      return;
    }
    const qs = filtersToSearchParams(filters);
    const buktiParam = format === "pdf" ? `&bukti=${includeBukti ? "1" : "0"}` : "";
    const url = `/api/export?format=${format}&mode=${mode}${buktiParam}${qs ? `&${qs}` : ""}`;
    window.location.href = url;
    toast.success(
      "Export dimulai",
      `${format === "pdf" ? "PDF" : "Excel"} ${mode === "petty" ? "Petty Cash" : "Transaksi"} (${filtered.length} transaksi).`,
    );
    onClose();
  };

  const hasFilter = !!(search || statuses.length || category || project || requester || period || dateFrom || dateTo);

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="center"
      width="wide"
      subtitle="Export Laporan"
      title="Pilih isi laporan yang ingin diexport"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          {hasFilter && (
            <Button variant="ghost" icon={X} onClick={reset}>
              Reset Filter
            </Button>
          )}
          <Button variant="primary" icon={Download} onClick={handleDownload} disabled={filtered.length === 0}>
            Download {format.toUpperCase()}
          </Button>
        </>
      }
    >
      {/* Report-type cards */}
      <SectionLabel>Tipe Laporan</SectionLabel>
      <div className="row gap-12" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        <TypeCard
          icon={Wallet}
          active={mode === "petty"}
          onClick={() => setMode("petty")}
          title="Laporan Petty Cash"
          desc="Termasuk Saldo Awal & Akhir, perubahan kas selama periode."
        />
        <TypeCard
          icon={Receipt}
          active={mode === "transactions"}
          onClick={() => setMode("transactions")}
          title="Laporan Transaksi"
          desc="Hanya daftar transaksi. Tanpa perhitungan saldo."
        />
      </div>

      <SectionLabel>Format File</SectionLabel>
      <div className="row gap-12" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        <FormatCard
          icon={FileText}
          active={format === "pdf"}
          onClick={() => setFormat("pdf")}
          title="PDF"
          desc="Cocok dicetak / dilampirkan ke email."
        />
        <FormatCard
          icon={FileSpreadsheet}
          active={format === "xlsx"}
          onClick={() => setFormat("xlsx")}
          title="Excel (.xlsx)"
          desc="Bisa difilter, dipivot, dan dianalisis lanjutan."
        />
      </div>

      <SectionLabel>
        Filter Isi Laporan{hasFilter && <span className="dim mono" style={{ marginLeft: 8, fontSize: 10 }}>· Disesuaikan dari tabel</span>}
      </SectionLabel>

      <div className="grid-2" style={{ gap: 16, marginBottom: 12 }}>
        <FieldBlock label="Periode">
          <select
            className="select"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (e.target.value !== "custom") {
                setDateFrom("");
                setDateTo("");
              }
            }}
          >
            {PERIOD_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <input
                className="input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Dari"
              />
              <span className="dim mono" style={{ fontSize: 10 }}>
                s/d
              </span>
              <input
                className="input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Sampai"
              />
            </div>
          )}
        </FieldBlock>

        <FieldBlock label="Proyek">
          <select className="select" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Semua Proyek</option>
            {(state.projects ?? []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock label="Kategori">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Semua Kategori</option>
            {state.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock label="Pemohon">
          <select className="select" value={requester} onChange={(e) => setRequester(e.target.value)}>
            <option value="">Semua Pemohon</option>
            {state.users.filter((u) => u.active).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FieldBlock>
      </div>

      <FieldBlock label="Status">
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {(["reported", "verified", "closed", "rejected"] as const).map((s) => {
            const on = statuses.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                style={{
                  border: `1px solid ${on ? "var(--brand-sky)" : "var(--hairline)"}`,
                  background: on ? "rgba(94,182,250,0.12)" : "transparent",
                  color: on ? "#cfe6fc" : "rgba(255,255,255,0.75)",
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
            );
          })}
          <span className="dim mono" style={{ fontSize: 10, alignSelf: "center", marginLeft: 4 }}>
            (Kosong = semua status)
          </span>
        </div>
      </FieldBlock>

      <FieldBlock label="Pencarian Bebas">
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari ID, deskripsi, nama pemohon, atau proyek…"
        />
      </FieldBlock>

      {/* Bukti toggle — only meaningful for PDF */}
      {format === "pdf" && (
        <div
          style={{
            marginTop: 4,
            marginBottom: 14,
            padding: "12px 14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--hairline)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Sertakan Lampiran Bukti</div>
            <div className="mono dim" style={{ fontSize: 11, lineHeight: 1.5, letterSpacing: 0, textTransform: "none" }}>
              {buktiCount > 0
                ? `${buktiCount} bukti dari ${txWithBukti} transaksi akan dilampirkan, setiap bukti ditandai dengan ID transaksinya.`
                : "Tidak ada bukti pada transaksi yang dipilih."}
            </div>
          </div>
          <Switch checked={includeBukti} onChange={setIncludeBukti} />
        </div>
      )}

      {/* Preview */}
      <div
        style={{
          marginTop: 8,
          padding: "14px 16px",
          background: filtered.length === 0 ? "rgba(187, 81, 83, 0.06)" : "rgba(94, 182, 250, 0.06)",
          border: `1px solid ${filtered.length === 0 ? "rgba(187, 81, 83, 0.2)" : "rgba(94, 182, 250, 0.2)"}`,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "0 0 auto" }}>
          <CheckCircle2 size={20} style={{ color: filtered.length === 0 ? "#e08a8c" : "var(--brand-sky)" }} />
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
            {filtered.length === 0
              ? "Tidak ada transaksi yang cocok"
              : `${filtered.length} transaksi akan diexport`}
          </div>
          <div className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {range
              ? `Periode: ${fmtDate(range.from)} – ${fmtDate(Math.min(range.to, Date.now()))}`
              : "Periode: Semua waktu"}
          </div>
        </div>
        {filtered.length > 0 && (
          <div style={{ textAlign: "right", flex: "none" }}>
            <div
              className="mono"
              style={{
                fontSize: 16,
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {fmtIDR(total)}
            </div>
            <div className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total Nominal
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: "var(--muted-foreground)",
        marginBottom: 8,
        marginTop: 0,
      }}
    >
      {children}
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

function TypeCard({
  icon: Icon,
  active,
  onClick,
  title,
  desc,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 220px",
        minWidth: 220,
        padding: "14px 16px",
        textAlign: "left",
        background: active ? "rgba(94, 182, 250, 0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? "var(--brand-sky)" : "var(--hairline)"}`,
        borderRadius: 10,
        color: "#fff",
        cursor: "pointer",
        transition: "all 150ms",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: active ? "rgba(94, 182, 250, 0.16)" : "rgba(255,255,255,0.04)",
          display: "grid",
          placeItems: "center",
          color: active ? "var(--brand-sky)" : "rgba(255,255,255,0.65)",
          flex: "none",
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{title}</div>
        <div className="mono dim" style={{ fontSize: 11, lineHeight: 1.5, letterSpacing: 0, textTransform: "none" }}>
          {desc}
        </div>
      </div>
      {active && <CheckCircle2 size={16} style={{ color: "var(--brand-sky)", flex: "none" }} />}
    </button>
  );
}

function FormatCard({
  icon: Icon,
  active,
  onClick,
  title,
  desc,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 220px",
        minWidth: 220,
        padding: "12px 14px",
        textAlign: "left",
        background: active ? "rgba(94, 182, 250, 0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? "var(--brand-sky)" : "var(--hairline)"}`,
        borderRadius: 10,
        color: "#fff",
        cursor: "pointer",
        transition: "all 150ms",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <Icon size={18} style={{ color: active ? "var(--brand-sky)" : "rgba(255,255,255,0.65)", flex: "none" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div
          className="mono dim"
          style={{ fontSize: 10, lineHeight: 1.5, letterSpacing: 0, textTransform: "none", marginTop: 2 }}
        >
          {desc}
        </div>
      </div>
    </button>
  );
}
