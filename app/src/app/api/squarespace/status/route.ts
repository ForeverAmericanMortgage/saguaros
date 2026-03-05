import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { getSquarespaceConnectionStatus } from "@/lib/integrations/squarespace";

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, squarespace: getSquarespaceConnectionStatus() });
}