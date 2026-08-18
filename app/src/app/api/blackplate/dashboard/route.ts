import { NextRequest, NextResponse } from "next/server";
import { getBlackplateDashboard } from "@/lib/blackplate-analytics";

export async function GET(request: NextRequest) {
  try {
    const daysParam = request.nextUrl.searchParams.get("days");
    const days = daysParam ? Number(daysParam) : 7;
    const payload = await getBlackplateDashboard(days);

    return NextResponse.json({
      ok: true,
      ...payload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load Black Plate dashboard.",
      },
      { status: 500 }
    );
  }
}
