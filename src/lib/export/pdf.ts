import "server-only";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fmtDate, fmtDateTime, fmtIDR, STATUS_LABEL } from "@/lib/format";
import type { AppState, Attachment, Transaction } from "@/lib/types";
import type { ResolvedRange } from "@/lib/filters";
import { balanceAt, reportBounds } from "@/lib/saldo";

// Brand palette
const BRAND_NAVY: [number, number, number] = [5, 10, 48];
const BRAND_DEEP: [number, number, number] = [5, 87, 148];
const BRAND_SKY: [number, number, number] = [94, 182, 250];
const TEXT_INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const BG_TINT: [number, number, number] = [248, 250, 252];
const ACCENT_GREEN: [number, number, number] = [128, 203, 135];
const ACCENT_ORANGE: [number, number, number] = [216, 160, 122];

export type ReportMode = "petty" | "transactions";

interface BuildOpts {
  generatedBy?: string;
  mode?: ReportMode;
  project?: string;
  pic?: string;
  /** Whether to render an appendix with each transaction's bukti. */
  includeBukti?: boolean;
}

type DocLike = jsPDF & { lastAutoTable?: { finalY: number } };

let _logoCache: string | null | undefined;
function loadLogoDataUri(): string | null {
  if (_logoCache !== undefined) return _logoCache;
  try {
    const file = path.resolve(process.cwd(), "public", "rant-ai.png");
    _logoCache = `data:image/png;base64,${readFileSync(file).toString("base64")}`;
  } catch {
    _logoCache = null;
  }
  return _logoCache;
}

interface RasterizedImage {
  dataUri: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
}

/**
 * Convert any bukti data URI into a PNG / JPEG that jsPDF can embed.
 * - PNG/JPEG: pass through
 * - SVG: rasterize via sharp at ~800px wide
 * - PDF / other: returns null (we render a placeholder card instead)
 */
async function rasterize(att: Attachment): Promise<RasterizedImage | null> {
  if (!att.imgData) return null;
  const dataUri = att.imgData;

  // PNG / JPEG: re-encode to JPEG at a sane size to keep the PDF small.
  // Real-world receipts are often 4000px camera photos; downsize aggressively.
  if (dataUri.startsWith("data:image/png") || dataUri.startsWith("data:image/jpeg") || dataUri.startsWith("data:image/jpg")) {
    try {
      const buf = bufferFromDataUri(dataUri);
      const { data, info } = await sharp(buf)
        .rotate() // honour EXIF orientation
        .resize({ width: 1000, height: 1400, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      return {
        dataUri: `data:image/jpeg;base64,${data.toString("base64")}`,
        format: "JPEG",
        width: info.width,
        height: info.height,
      };
    } catch {
      // Fall back to the original data URI if sharp can't process it
      const format: "PNG" | "JPEG" = dataUri.startsWith("data:image/png") ? "PNG" : "JPEG";
      return { dataUri, format, width: 800, height: 1000 };
    }
  }

  // SVG → JPEG (better compression than PNG for receipts; PDF stays small)
  if (dataUri.startsWith("data:image/svg")) {
    try {
      const buf = bufferFromDataUri(dataUri);
      const { data, info } = await sharp(buf, { density: 150 })
        .resize({ width: 700, height: 950, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#fbf8f2" })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      return {
        dataUri: `data:image/jpeg;base64,${data.toString("base64")}`,
        format: "JPEG",
        width: info.width,
        height: info.height,
      };
    } catch {
      return null;
    }
  }

  return null;
}

function bufferFromDataUri(uri: string): Buffer {
  const commaIdx = uri.indexOf(",");
  if (commaIdx < 0) throw new Error("malformed data URI");
  const header = uri.slice(0, commaIdx);
  const payload = uri.slice(commaIdx + 1);
  if (header.includes(";base64")) return Buffer.from(payload, "base64");
  return Buffer.from(decodeURIComponent(payload));
}

export async function buildPdf(
  state: AppState,
  transactions: Transaction[],
  range: ResolvedRange | null,
  opts: BuildOpts = {},
): Promise<Buffer> {
  const mode: ReportMode = opts.mode ?? "petty";
  const includeBukti = opts.includeBukti ?? true;
  const title = mode === "petty" ? "Laporan Penggunaan Petty Cash" : "Laporan Transaksi";
  const subtitle = "RantAI · Kas Operasional Internal";

  // A4 portrait, with stream compression to keep embedded images compact
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true }) as DocLike;
  const pageWidth = doc.internal.pageSize.getWidth(); // 595
  const pageHeight = doc.internal.pageSize.getHeight(); // 842
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // ====== Compute saldo ======
  const bounds = reportBounds(transactions, range);
  const saldoBefore = bounds ? balanceAt(state, bounds.from - 1) : state.fund.currentBalance;
  const saldoAfter = bounds ? balanceAt(state, bounds.to) : state.fund.currentBalance;
  const totalExpense = transactions.reduce((s, t) => s + t.amount, 0);
  const verifiedExpense = transactions
    .filter((t) => t.verifiedAt && t.status !== "rejected")
    .reduce((s, t) => s + t.amount, 0);

  // ====== Header band ======
  const HEADER_H = 96;
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(0, 0, pageWidth, HEADER_H, "F");
  doc.setFillColor(...BRAND_SKY);
  doc.rect(0, HEADER_H, pageWidth, 3, "F");

  const logo = loadLogoDataUri();
  if (logo) {
    doc.setFillColor(246, 248, 251);
    doc.roundedRect(margin, 24, 48, 48, 6, 6, "F");
    try {
      doc.addImage(logo, "PNG", margin + 4, 28, 40, 40);
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin + 64, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 200, 220);
  doc.text(subtitle, margin + 64, 62);

  doc.setTextColor(180, 200, 220);
  doc.setFontSize(8);
  doc.text(`Dibuat: ${fmtDateTime(Date.now())}`, pageWidth - margin, 34, { align: "right" });
  if (opts.generatedBy) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(opts.generatedBy, pageWidth - margin, 50, { align: "right" });
    doc.setFontSize(7);
    doc.setTextColor(180, 200, 220);
    doc.text("dibuat oleh", pageWidth - margin, 62, { align: "right" });
  }

  // ====== Period band ======
  let y = HEADER_H + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_INK);
  doc.text("PERIODE LAPORAN", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_DEEP);
  const periodText = bounds
    ? `${fmtDate(bounds.from)}  —  ${fmtDate(Math.min(bounds.to, Date.now()))}`
    : "Semua Periode";
  doc.text(periodText, margin, y + 16);

  const chipParts: string[] = [];
  if (range?.label) chipParts.push(`Filter: ${range.label}`);
  if (opts.project) chipParts.push(`Proyek: ${opts.project}`);
  if (opts.pic) chipParts.push(`PIC: ${opts.pic}`);
  if (chipParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(chipParts.join("    ·    "), margin, y + 30);
  }

  y += 50;

  // ====== Stat cards ======
  const cardGap = 8;
  if (mode === "petty") {
    // 2 rows × 2 cards in portrait
    const cardW = (contentWidth - cardGap) / 2;
    const cardH = 60;
    drawStatCard(doc, margin, y, cardW, cardH, {
      label: "SALDO AWAL",
      value: fmtIDR(saldoBefore),
      sub: bounds ? `pada ${fmtDate(bounds.from)}` : undefined,
      accent: BRAND_SKY,
    });
    drawStatCard(doc, margin + cardW + cardGap, y, cardW, cardH, {
      label: "TOTAL PENGELUARAN",
      value: fmtIDR(totalExpense),
      sub: `${transactions.length} transaksi · ${fmtIDR(verifiedExpense)} terverifikasi`,
      accent: ACCENT_ORANGE,
    });
    y += cardH + cardGap;
    drawStatCard(doc, margin, y, cardW, cardH, {
      label: "SALDO AKHIR",
      value: fmtIDR(saldoAfter),
      sub: bounds ? `pada ${fmtDate(Math.min(bounds.to, Date.now()))}` : undefined,
      accent: ACCENT_GREEN,
    });
    drawStatCard(doc, margin + cardW + cardGap, y, cardW, cardH, {
      label: "PLAFON KAS",
      value: fmtIDR(state.fund.ceiling),
      sub: state.fund.name,
      accent: BRAND_DEEP,
    });
    y += cardH + 18;
  } else {
    // 3 cards in a row
    const cardW = (contentWidth - cardGap * 2) / 3;
    const cardH = 64;
    drawStatCard(doc, margin, y, cardW, cardH, {
      label: "TOTAL PENGELUARAN",
      value: fmtIDR(totalExpense),
      sub: `${transactions.length} transaksi`,
      accent: ACCENT_ORANGE,
    });
    drawStatCard(doc, margin + (cardW + cardGap), y, cardW, cardH, {
      label: "TERVERIFIKASI",
      value: fmtIDR(verifiedExpense),
      sub: `${transactions.filter((t) => t.verifiedAt && t.status !== "rejected").length} transaksi`,
      accent: ACCENT_GREEN,
    });
    drawStatCard(doc, margin + (cardW + cardGap) * 2, y, cardW, cardH, {
      label: "RATA-RATA",
      value: fmtIDR(transactions.length ? Math.round(totalExpense / transactions.length) : 0),
      sub: opts.project ? `Proyek: ${opts.project}` : "Lintas proyek",
      accent: BRAND_SKY,
    });
    y += cardH + 18;
  }

  // ====== Category breakdown ======
  const byCat = new Map<string, { count: number; total: number }>();
  for (const t of transactions) {
    const cur = byCat.get(t.category) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += t.amount;
    byCat.set(t.category, cur);
  }
  if (byCat.size > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_INK);
    doc.text("BREAKDOWN PER KATEGORI", margin, y);
    y += 6;

    const catRows = Array.from(byCat.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, { count, total }]) => [
        cat,
        String(count),
        fmtIDR(total),
        totalExpense > 0 ? `${((total / totalExpense) * 100).toFixed(1)}%` : "—",
      ]);

    autoTable(doc, {
      startY: y,
      head: [["Kategori", "Jumlah", "Total", "% dari Total"]],
      body: catRows,
      theme: "plain",
      headStyles: {
        fillColor: BG_TINT,
        textColor: BRAND_NAVY,
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
        lineColor: LINE,
        lineWidth: 0.5,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: TEXT_INK,
        cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
        lineColor: LINE,
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 200 },
        1: { halign: "right", cellWidth: 60 },
        2: { halign: "right", cellWidth: 130 },
        3: { halign: "right", cellWidth: 80 },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable?.finalY ?? y;
    y += 18;
  }

  // ====== Transactions table ======
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_INK);
  doc.text(`DAFTAR TRANSAKSI · ${transactions.length}`, margin, y);
  y += 6;

  // Build a stable order we'll re-use for the appendix labelling
  const ordered = transactions.slice().sort((a, b) => a.createdAt - b.createdAt);

  const rows = ordered.map((tx, idx) => {
    const u = state.users.find((u) => u.id === tx.requesterId);
    return [
      String(idx + 1),
      tx.id,
      fmtDate(tx.createdAt, { short: true }),
      u?.name ?? "—",
      tx.project ?? "(Tanpa Proyek)",
      tx.pic ?? "—",
      tx.description,
      fmtIDR(tx.amount),
      STATUS_LABEL[tx.status] ?? tx.status,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "ID", "Tgl", "Pemohon", "Proyek", "PIC", "Deskripsi", "Jumlah", "Status"]],
    body: rows,
    theme: "plain",
    headStyles: {
      fillColor: BRAND_NAVY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_INK,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      lineColor: LINE,
      lineWidth: 0.4,
      valign: "middle",
    },
    alternateRowStyles: { fillColor: BG_TINT },
    columnStyles: {
      0: { cellWidth: 20, halign: "right", textColor: MUTED },
      1: { cellWidth: 58, font: "courier" },
      2: { cellWidth: 46 },
      3: { cellWidth: 70 },
      4: { cellWidth: 64 },
      5: { cellWidth: 60 },
      6: { cellWidth: "auto" },
      7: { cellWidth: 56, halign: "right", font: "courier" },
      8: { cellWidth: 60 },
    },
    margin: { left: margin, right: margin, top: 30, bottom: 36 },
    didDrawPage: (data) => {
      drawFooter(doc, data.pageNumber, pageWidth, pageHeight, margin);
      if (data.pageNumber > 1) drawRepeatHeader(doc, title, bounds, pageWidth, margin);
    },
  });

  // ====== Summary band ======
  let finalY = doc.lastAutoTable?.finalY ?? y;
  if (finalY > pageHeight - 90) {
    doc.addPage();
    drawRepeatHeader(doc, title, bounds, pageWidth, margin);
    finalY = 50;
  } else {
    finalY += 14;
  }
  doc.setFillColor(...BG_TINT);
  doc.roundedRect(margin, finalY, contentWidth, 44, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_INK);
  doc.text("Ringkasan", margin + 12, finalY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `${transactions.length} transaksi · ${fmtIDR(totalExpense)} (${fmtIDR(verifiedExpense)} terverifikasi)`,
    margin + 12,
    finalY + 32,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_NAVY);
  if (mode === "petty") {
    doc.text(`${fmtIDR(saldoBefore)}  »  ${fmtIDR(saldoAfter)}`, pageWidth - margin - 12, finalY + 26, { align: "right" });
  } else {
    doc.text(`Verifikasi ${fmtIDR(verifiedExpense)}`, pageWidth - margin - 12, finalY + 26, { align: "right" });
  }

  // ====== Lampiran Bukti ======
  if (includeBukti) {
    const txsWithBukti = ordered.filter((t) => t.attachments && t.attachments.length > 0);
    if (txsWithBukti.length > 0) {
      // Section cover page
      doc.addPage();
      drawRepeatHeader(doc, title, bounds, pageWidth, margin);
      drawFooter(doc, doc.getNumberOfPages(), pageWidth, pageHeight, margin);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...BRAND_NAVY);
      doc.text("LAMPIRAN BUKTI", margin, 80);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      const attCount = txsWithBukti.reduce((s, t) => s + (t.attachments?.length ?? 0), 0);
      doc.text(
        `${attCount} bukti dari ${txsWithBukti.length} transaksi · diurutkan berdasarkan tanggal transaksi`,
        margin,
        100,
      );
      doc.setDrawColor(...LINE);
      doc.line(margin, 112, pageWidth - margin, 112);

      // Tiny index table
      const indexRows = txsWithBukti.map((tx, idx) => {
        const txNumber = ordered.indexOf(tx) + 1;
        return [
          `#${txNumber}`,
          tx.id,
          fmtDate(tx.createdAt, { short: true }),
          tx.description,
          fmtIDR(tx.amount),
          `${tx.attachments?.length ?? 0} bukti`,
        ];
      });
      autoTable(doc, {
        startY: 124,
        head: [["No.", "ID", "Tgl", "Deskripsi", "Jumlah", "Bukti"]],
        body: indexRows,
        theme: "plain",
        headStyles: {
          fillColor: BG_TINT,
          textColor: BRAND_NAVY,
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
          lineColor: LINE,
          lineWidth: 0.5,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: TEXT_INK,
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
          lineColor: LINE,
          lineWidth: 0.4,
        },
        columnStyles: {
          0: { cellWidth: 32, textColor: MUTED },
          1: { cellWidth: 64, font: "courier" },
          2: { cellWidth: 52 },
          3: { cellWidth: "auto" },
          4: { cellWidth: 70, halign: "right", font: "courier" },
          5: { cellWidth: 50, halign: "right", textColor: MUTED },
        },
        margin: { left: margin, right: margin, top: 30, bottom: 36 },
        didDrawPage: (data) => {
          drawFooter(doc, data.pageNumber, pageWidth, pageHeight, margin);
          if (data.pageNumber > 1) drawRepeatHeader(doc, title, bounds, pageWidth, margin);
        },
      });

      // One page (or more) per transaction
      for (const tx of txsWithBukti) {
        const txNumber = ordered.indexOf(tx) + 1;
        await drawBuktiPage(doc, state, tx, txNumber, {
          pageWidth,
          pageHeight,
          margin,
          contentWidth,
          title,
          bounds,
        });
      }
    }
  }

  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}

async function drawBuktiPage(
  doc: DocLike,
  state: AppState,
  tx: Transaction,
  txNumber: number,
  layout: {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentWidth: number;
    title: string;
    bounds: { from: number; to: number } | null;
  },
) {
  const { pageWidth, pageHeight, margin, contentWidth, title, bounds } = layout;
  doc.addPage();
  drawRepeatHeader(doc, title, bounds, pageWidth, margin);

  // Transaction header card
  const headerTop = 38;
  const headerH = 96;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, headerTop, contentWidth, headerH, 6, 6, "FD");

  // Number tag on the left
  doc.setFillColor(...BRAND_NAVY);
  doc.roundedRect(margin + 10, headerTop + 12, 44, 44, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(String(txNumber), margin + 32, headerTop + 41, { align: "center" });

  const headerLeft = margin + 66;
  const u = state.users.find((u) => u.id === tx.requesterId);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("BUKTI UNTUK TRANSAKSI", headerLeft, headerTop + 18);

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(tx.id, headerLeft, headerTop + 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_INK);
  // Wrap description
  const descLines = doc.splitTextToSize(tx.description, contentWidth - 200);
  doc.text(Array.isArray(descLines) ? descLines.slice(0, 2) : descLines, headerLeft, headerTop + 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const metaParts = [
    fmtDate(tx.createdAt),
    u?.name ?? "—",
    tx.project ?? "(Tanpa Proyek)",
    tx.pic ? `PIC: ${tx.pic}` : null,
    tx.category,
  ].filter((p): p is string => !!p);
  doc.text(metaParts.join("  ·  "), headerLeft, headerTop + 84);

  // Amount on the right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_DEEP);
  doc.text(fmtIDR(tx.amount), pageWidth - margin - 12, headerTop + 38, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(STATUS_LABEL[tx.status] ?? tx.status, pageWidth - margin - 12, headerTop + 54, { align: "right" });

  if (tx.verbalApproval) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT_GREEN);
    doc.text(`WA: ${tx.verbalApproval.slice(0, 40)}`, pageWidth - margin - 12, headerTop + 70, {
      align: "right",
    });
  }

  // Bukti area
  let imgTop = headerTop + headerH + 16;
  const atts = tx.attachments ?? [];

  for (let i = 0; i < atts.length; i++) {
    const att = atts[i];
    const isLast = i === atts.length - 1;

    // Label band
    doc.setFillColor(...BRAND_SKY);
    doc.rect(margin, imgTop, 3, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_NAVY);
    doc.text(
      `Bukti #${i + 1} dari ${atts.length} — ${tx.id}`,
      margin + 10,
      imgTop + 10,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const uploader = state.users.find((u) => u.id === att.uploadedBy);
    const uploaderLine = `${att.fileName}${uploader ? `  ·  diupload oleh ${uploader.name}` : ""}  ·  ${fmtDateTime(att.uploadedAt)}`;
    doc.text(uploaderLine, pageWidth - margin, imgTop + 10, { align: "right" });

    imgTop += 18;

    // Compute target image box
    const maxImgWidth = contentWidth;
    // Reserve space for footer (36pt) and small gap; also for next image area if multiple
    const remaining = pageHeight - imgTop - 36;
    const perImageHeight = atts.length === 1
      ? remaining
      : Math.min(remaining, Math.floor((pageHeight - (headerTop + headerH + 16) - 36) / atts.length) - 22);

    const img = await rasterize(att);
    if (img) {
      const aspect = img.width / img.height;
      let drawW = maxImgWidth;
      let drawH = drawW / aspect;
      if (drawH > perImageHeight) {
        drawH = perImageHeight;
        drawW = drawH * aspect;
      }
      const xOffset = margin + (maxImgWidth - drawW) / 2;
      try {
        // Subtle frame
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.5);
        doc.rect(xOffset - 2, imgTop - 2, drawW + 4, drawH + 4);
        doc.addImage(img.dataUri, img.format, xOffset, imgTop, drawW, drawH);
      } catch {
        drawAttachmentPlaceholder(doc, margin, imgTop, contentWidth, perImageHeight, att);
      }
      imgTop += drawH + (isLast ? 0 : 14);
    } else {
      drawAttachmentPlaceholder(doc, margin, imgTop, contentWidth, perImageHeight, att);
      imgTop += perImageHeight + (isLast ? 0 : 14);
    }

    // If we'll overflow on the next image, start a continuation page
    if (!isLast && imgTop > pageHeight - 200) {
      drawFooter(doc, doc.getNumberOfPages(), pageWidth, pageHeight, margin);
      doc.addPage();
      drawRepeatHeader(doc, title, bounds, pageWidth, margin);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Lanjutan bukti — ${tx.id}`, margin, 36);
      imgTop = 50;
    }
  }

  drawFooter(doc, doc.getNumberOfPages(), pageWidth, pageHeight, margin);
}

function drawAttachmentPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  att: Attachment,
) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, Math.max(h, 80), 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("File tidak bisa di-preview", x + w / 2, y + Math.max(h, 80) / 2 - 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(att.fileName, x + w / 2, y + Math.max(h, 80) / 2 + 8, { align: "center" });
}

function drawFooter(
  doc: jsPDF,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
) {
  doc.setDrawColor(...BRAND_SKY);
  doc.setLineWidth(0.6);
  doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Petty — RantAI Kas Operasional Internal", margin, pageHeight - 12);
  doc.text(`Hal. ${pageNumber}`, pageWidth - margin, pageHeight - 12, { align: "right" });
}

function drawRepeatHeader(
  doc: jsPDF,
  title: string,
  bounds: { from: number; to: number } | null,
  pageWidth: number,
  margin: number,
) {
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 220);
  if (bounds) {
    doc.text(
      `${fmtDate(bounds.from, { short: true })} – ${fmtDate(Math.min(bounds.to, Date.now()), { short: true })}`,
      pageWidth - margin,
      14,
      { align: "right" },
    );
  }
}

function drawStatCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { label: string; value: string; sub?: string; accent: [number, number, number] },
) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 6, 6, "FD");

  doc.setFillColor(...opts.accent);
  doc.rect(x, y, 3, h, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(opts.label, x + 10, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(opts.value, x + 10, y + 34);

  if (opts.sub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const maxChars = Math.floor((w - 20) / 3.6);
    const sub = opts.sub.length > maxChars ? opts.sub.slice(0, maxChars - 1) + "…" : opts.sub;
    doc.text(sub, x + 10, y + 50);
  }
}
