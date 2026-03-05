import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { getQuickBooksConnectionStatus } from "@/lib/integrations/qbo";

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const status = await getQuickBooksConnectionStatus();
    return NextResponse.json({ ok: true, quickbooks: status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}