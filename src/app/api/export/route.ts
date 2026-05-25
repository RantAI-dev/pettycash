import { NextResponse } from "next/server";
import { getFullState } from "@/lib/db/queries";
import { requireUserId } from "@/lib/session";
import { applyFilters, filtersFromSearchParams, resolveRange } from "@/lib/filters";
import { buildExcel } from "@/lib/export/excel";
import { buildPdf } from "@/lib/export/pdf";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

type ReportMode = "petty" | "transactions";

function makeFilename(
  format: "pdf" | "xlsx",
  mode: ReportMode,
  range: ReturnType<typeof resolveRange>,
  project?: string,
  pic?: string,
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const modePart = mode === "petty" ? "petty-cash" : "transaksi";
  const periodPart = range
    ? `${fmtDate(range.from, { short: true })}_${fmtDate(Math.min(range.to, Date.now()), { short: true })}`
    : "semua-periode";
  const projectPart = project ? `_${project}` : "";
  const picPart = pic ? `_pic-${pic}` : "";
  return sanitizeFilename(`laporan-${modePart}${projectPart}${picPart}_${periodPart}_${stamp}.${format}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "pdf").toLowerCase();
  const mode = (url.searchParams.get("mode") || "petty").toLowerCase() as ReportMode;
  const includeBukti = url.searchParams.get("bukti") !== "0";
  if (format !== "pdf" && format !== "xlsx") {
    return NextResponse.json({ error: "format must be 'pdf' or 'xlsx'" }, { status: 400 });
  }
  if (mode !== "petty" && mode !== "transactions") {
    return NextResponse.json({ error: "mode must be 'petty' or 'transactions'" }, { status: 400 });
  }

  const userId = await requireUserId();
  const state = await getFullState(userId);
  const filters = filtersFromSearchParams(url.searchParams);
  const range = resolveRange(filters);
  const transactions = applyFilters(state, filters);

  const filename = makeFilename(format, mode, range, filters.project, filters.pic);
  const generatedBy = state.users.find((u) => u.id === userId)?.name;

  if (format === "xlsx") {
    const buffer = await buildExcel(state, transactions, range, {
      mode,
      project: filters.project,
      pic: filters.pic,
    });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buffer = await buildPdf(state, transactions, range, {
    generatedBy,
    mode,
    project: filters.project,
    pic: filters.pic,
    includeBukti,
  });
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
