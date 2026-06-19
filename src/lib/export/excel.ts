import "server-only";
import ExcelJS from "exceljs";
import { fmtDate, STATUS_LABEL } from "@/lib/format";
import type { AppState, Transaction } from "@/lib/types";
import type { ResolvedRange } from "@/lib/filters";
import { reportBounds, saldoForPeriod } from "@/lib/saldo";

export type ReportMode = "petty" | "transactions";

export async function buildExcel(
  state: AppState,
  transactions: Transaction[],
  range: ResolvedRange | null,
  opts: { mode?: ReportMode; project?: string; pic?: string } = {},
): Promise<Buffer> {
  const mode: ReportMode = opts.mode ?? "petty";
  const wb = new ExcelJS.Workbook();
  wb.creator = "Petty — RantAI";
  wb.created = new Date();

  // ====== Sheet 1: Transactions ======
  const ws = wb.addWorksheet("Transaksi", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "ID", key: "id", width: 18 },
    { header: "Tanggal Dibuat", key: "createdAt", width: 18 },
    { header: "Tgl Pengeluaran", key: "spentDate", width: 18 },
    { header: "Tgl Verifikasi", key: "verifiedAt", width: 18 },
    { header: "Pemohon", key: "requester", width: 26 },
    { header: "Divisi", key: "divisi", width: 14 },
    { header: "Proyek", key: "project", width: 26 },
    { header: "PIC", key: "pic", width: 22 },
    { header: "Kategori", key: "category", width: 18 },
    { header: "Deskripsi", key: "description", width: 50 },
    { header: "Jumlah (Rp)", key: "amount", width: 16 },
    { header: "Status", key: "status", width: 20 },
    { header: "Approval Lisan / WA", key: "verbalApproval", width: 36 },
    { header: "Bukti (count)", key: "buktiCount", width: 12 },
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF050A30" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F0F8" } };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;

  for (const tx of transactions) {
    const u = state.users.find((u) => u.id === tx.requesterId);
    ws.addRow({
      id: tx.id,
      createdAt: fmtDate(tx.createdAt),
      spentDate: tx.spentDate ? fmtDate(tx.spentDate) : "",
      verifiedAt: tx.verifiedAt ? fmtDate(tx.verifiedAt) : "",
      requester: u?.name ?? "",
      divisi: u?.divisi ?? "",
      project: tx.project ?? "(Tanpa Proyek)",
      pic: tx.pic ?? "",
      category: tx.category,
      description: tx.description,
      amount: tx.amount,
      status: STATUS_LABEL[tx.status] ?? tx.status,
      verbalApproval: tx.verbalApproval ?? "",
      buktiCount: tx.attachments?.length ?? 0,
    });
  }

  // Currency formatting for amount column
  ws.getColumn("amount").numFmt = '"Rp" #,##0;[Red]-"Rp" #,##0';
  ws.getColumn("amount").alignment = { horizontal: "right" };

  // Mono ID column tinted
  ws.getColumn("id").font = { name: "Consolas" };

  // Total row
  if (transactions.length > 0) {
    const totalRow = ws.addRow({
      id: "",
      createdAt: "",
      spentDate: "",
      verifiedAt: "",
      requester: "",
      divisi: "",
      project: "",
      pic: "",
      category: "",
      description: `TOTAL · ${transactions.length} transaksi`,
      amount: transactions.reduce((s, t) => s + t.amount, 0),
      status: "",
      verbalApproval: "",
      buktiCount: "",
    });
    totalRow.font = { bold: true };
    totalRow.getCell("description").alignment = { horizontal: "right" };
    totalRow.getCell("amount").numFmt = '"Rp" #,##0';
  }

  // Auto filter on header
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  // ====== Sheet 2: Ringkasan (summary) ======
  const sum = wb.addWorksheet("Ringkasan");
  sum.columns = [
    { header: "Metrik", key: "k", width: 32 },
    { header: "Nilai", key: "v", width: 28 },
  ];
  const sumHeader = sum.getRow(1);
  sumHeader.font = { bold: true, color: { argb: "FF050A30" }, size: 11 };
  sumHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F0F8" } };

  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
  const verifiedAmount = transactions
    .filter((t) => t.verifiedAt && t.status !== "rejected")
    .reduce((s, t) => s + t.amount, 0);
  const bounds = reportBounds(transactions, range);
  const { awal: saldoBefore, akhir: saldoAfter } = saldoForPeriod(state, bounds);

  sum.addRow({ k: "Mode Laporan", v: mode === "petty" ? "Laporan Penggunaan Petty Cash" : "Laporan Transaksi" });
  sum.addRow({ k: "Periode", v: range ? `${fmtDate(range.from)} – ${fmtDate(range.to)}` : "Semua Periode" });
  if (opts.project) sum.addRow({ k: "Proyek", v: opts.project });
  if (opts.pic) sum.addRow({ k: "PIC", v: opts.pic });
  sum.addRow({ k: "Jumlah Transaksi", v: transactions.length });
  sum.addRow({ k: "Total Nominal", v: totalAmount });
  sum.addRow({ k: "Total Terverifikasi", v: verifiedAmount });
  if (mode === "petty") {
    sum.addRow({});
    const sb = sum.addRow({ k: "Saldo Awal", v: saldoBefore });
    sb.font = { bold: true };
    const sa = sum.addRow({ k: "Saldo Akhir", v: saldoAfter });
    sa.font = { bold: true };
    sum.addRow({ k: "Plafon Kas", v: state.fund.ceiling });
  }
  sum.addRow({});

  // Status breakdown
  const byStatus = new Map<string, { count: number; total: number }>();
  for (const t of transactions) {
    const cur = byStatus.get(t.status) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += t.amount;
    byStatus.set(t.status, cur);
  }
  sum.addRow({ k: "BREAKDOWN STATUS", v: "" }).font = { bold: true };
  for (const [s, { count, total }] of byStatus) {
    sum.addRow({ k: `  ${STATUS_LABEL[s] ?? s} (${count})`, v: total });
  }
  sum.addRow({});

  // Category breakdown
  const byCat = new Map<string, { count: number; total: number }>();
  for (const t of transactions) {
    const cur = byCat.get(t.category) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += t.amount;
    byCat.set(t.category, cur);
  }
  sum.addRow({ k: "BREAKDOWN KATEGORI", v: "" }).font = { bold: true };
  const catEntries = Array.from(byCat.entries()).sort((a, b) => b[1].total - a[1].total);
  for (const [c, { count, total }] of catEntries) {
    sum.addRow({ k: `  ${c} (${count})`, v: total });
  }
  sum.addRow({});

  // Project breakdown
  const byProj = new Map<string, { count: number; total: number }>();
  for (const t of transactions) {
    const p = t.project ?? "(Tanpa Proyek)";
    const cur = byProj.get(p) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += t.amount;
    byProj.set(p, cur);
  }
  sum.addRow({ k: "BREAKDOWN PROYEK", v: "" }).font = { bold: true };
  const projEntries = Array.from(byProj.entries()).sort((a, b) => b[1].total - a[1].total);
  for (const [p, { count, total }] of projEntries) {
    sum.addRow({ k: `  ${p} (${count})`, v: total });
  }
  sum.addRow({});

  // PIC breakdown
  const byPic = new Map<string, { count: number; total: number }>();
  for (const t of transactions) {
    const p = t.pic ?? "(Tanpa PIC)";
    const cur = byPic.get(p) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += t.amount;
    byPic.set(p, cur);
  }
  sum.addRow({ k: "BREAKDOWN PIC", v: "" }).font = { bold: true };
  const picEntries = Array.from(byPic.entries()).sort((a, b) => b[1].total - a[1].total);
  for (const [p, { count, total }] of picEntries) {
    sum.addRow({ k: `  ${p} (${count})`, v: total });
  }

  sum.getColumn("v").numFmt = '"Rp" #,##0;[Red]-"Rp" #,##0';

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
