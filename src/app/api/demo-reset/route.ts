import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const stats = await seedDatabase();
  return NextResponse.json({ ok: true, stats });
}
