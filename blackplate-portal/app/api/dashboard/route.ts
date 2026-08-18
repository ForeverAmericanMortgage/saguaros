import { NextRequest, NextResponse } from "next/server";
import { getDashboard } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const days = Number(request.nextUrl.searchParams.get("days") || 30);
    return NextResponse.json({ ok: true, ...(await getDashboard(days)) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Dashboard data failed to load." },
      { status: 500 }
    );
  }
}
