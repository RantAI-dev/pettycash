import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureReady, schema } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PatchBody {
  name?: string;
  ceiling?: number;
  currentBalance?: number;
  custodianId?: string;
  preApprovalThreshold?: number;
  buktiSlaHours?: number;
}

export async function PATCH(req: Request) {
  await ensureReady();
  const body = (await req.json()) as PatchBody;
  const fundRows = await db.select().from(schema.funds).limit(1);
  const fund = fundRows[0];
  if (!fund) return NextResponse.json({ error: "no fund" }, { status: 404 });
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.ceiling !== undefined) patch.ceiling = body.ceiling;
  if (body.currentBalance !== undefined) patch.currentBalance = body.currentBalance;
  if (body.custodianId !== undefined) patch.custodianId = body.custodianId;
  if (body.preApprovalThreshold !== undefined) patch.preApprovalThreshold = body.preApprovalThreshold;
  if (body.buktiSlaHours !== undefined) patch.buktiSlaHours = body.buktiSlaHours;
  await db.update(schema.funds).set(patch).where(eq(schema.funds.id, fund.id));
  return NextResponse.json({ ok: true });
}
