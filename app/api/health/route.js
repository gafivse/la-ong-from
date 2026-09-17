import { NextResponse } from "next/server";
import { db } from "../../../lib/db.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "OK" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "UNAVAILABLE" }, { status: 503 });
  }
}
