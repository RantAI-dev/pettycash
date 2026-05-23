import { NextResponse } from "next/server";
import { getFullState } from "@/lib/db/queries";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const userId = await requireUserId();
    const state = await getFullState(userId);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
